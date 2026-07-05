require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes  = require("./routes/auth");
const tripRoutes  = require("./routes/trips");
const chatRoutes  = require("./routes/chat");
const userRoutes  = require("./routes/users");
const notificationsRoutes = require("./routes/notifications");
const { authLimiter, apiLimiter, sanitizeBody, requestLogger } = require("./middleware/security");
const { notFoundHandler, globalErrorHandler } = require("./middleware/errorHandler");
const Message     = require("./models/Message");
const Trip        = require("./models/Trip");
const Notification= require("./models/Notification");
const authMiddleware = require("./middleware/auth");
const jwt = require("jsonwebtoken");
const User = require("./models/User");

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// ── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(sanitizeBody);
app.use(requestLogger);

// ── Routes ───────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/trips", apiLimiter,  tripRoutes);
app.use("/api/chat",  apiLimiter,  chatRoutes);
app.use("/api/users", apiLimiter,  userRoutes);
app.use("/api/notifications", apiLimiter, notificationsRoutes);

app.get("/api/health", (req, res) =>
  res.json({ status: "ok", time: new Date().toISOString() })
);

// ── Socket.IO - Real-time Chat ───────────────────────────────
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("No token"));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) return next(new Error("User not found"));
    socket.user = user;
    next();
  } catch {
    next(new Error("Auth error"));
  }
});

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.user.name}`);

  // Join trip chat room
  socket.on("join_trip", (tripId) => {
    socket.join(`trip_${tripId}`);
    console.log(`${socket.user.name} joined room trip_${tripId}`);
  });

  // Send chat message
  socket.on("send_message", async ({ tripId, text }) => {
    try {
      if (!text?.trim()) return;
      const msg = await Message.create({
        trip: tripId,
        sender: socket.user._id,
        text: text.trim(),
      });
      await msg.populate("sender", "name profilePhoto");

      // Notify other participants
      const trip = await Trip.findById(tripId);
      if (trip) {
        const recipients = [trip.host];
        trip.passengers.forEach(p => {
          if (p.status === "accepted") recipients.push(p.user);
        });
        
        const notifyOps = recipients
          .filter(id => id.toString() !== socket.user._id.toString())
          .map(id => ({
            recipient: id,
            sender: socket.user._id,
            type: "chat",
            content: `New message from ${socket.user.name}: ${text.substring(0, 20)}...`,
            relatedTrip: tripId
          }));
        
        if (notifyOps.length > 0) {
          await Notification.insertMany(notifyOps);
        }
      }

      io.to(`trip_${tripId}`).emit("new_message", {
        _id: msg._id,
        trip: tripId,
        sender: { _id: socket.user._id, name: socket.user.name, profilePhoto: socket.user.profilePhoto },
        text: msg.text,
        createdAt: msg.createdAt,
      });
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  // Live location update
  socket.on("location_update", ({ tripId, lat, lng }) => {
    socket.to(`trip_${tripId}`).emit("partner_location", {
      userId: socket.user._id,
      name: socket.user.name,
      lat, lng,
    });
  });

  // Trip match notification (broadcast to all in city room)
  socket.on("join_city", (city) => {
    socket.join(`city_${city}`);
  });

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.user.name}`);
  });
});

// Expose io for routes
app.set("io", io);
// ── Error Handlers (must be last middleware) ─────────────────
app.use(notFoundHandler);
app.use(globalErrorHandler);


// ── DB + Start ────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const MONGO = process.env.MONGODB_URI || "mongodb://localhost:27017/travelshare";

const { runTripCleanup } = require("./utils/cleanup");

mongoose
  .connect(MONGO)
  .then(() => {
    console.log("✅ MongoDB connected");
    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      // Run cleanup on startup and then every 5 minutes
      runTripCleanup();
      setInterval(runTripCleanup, 5 * 60 * 1000);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });
