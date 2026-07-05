const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  type: {
    type: String,
    enum: ["chat", "trip_request", "trip_accepted", "trip_rejected", "trip_started", "trip_completed", "trip_cancelled"],
    required: true,
  },
  content: { type: String },
  relatedTrip: { type: mongoose.Schema.Types.ObjectId, ref: "Trip" },
  isRead: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model("Notification", notificationSchema);
