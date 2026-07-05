const express = require("express");
const axios = require("axios");
const Trip = require("../models/Trip");
const Notification = require("../models/Notification");
const Review = require("../models/Review");
const User = require("../models/User");
const auth = require("../middleware/auth");
const { findTopMatches, calculateCostSplit, haversine } = require("../utils/matching");
const { estimateFareRange } = require("../utils/fare");

const normalizeCity = (city, fallback = "Kolkata") => String(city || fallback).trim();

const router = express.Router();
const ML_API = process.env.ML_API_URL || "http://localhost:5001";

const emitTripUpdate = (req, trip) => {
  const io = req.app.get("io");
  if (io) {
    io.to(`trip_${trip._id}`).emit("trip_updated", { trip });
  }
};

// POST /api/trips - Create a new trip
router.post("/", auth, async (req, res) => {
  try {
    const {
      tripType, origin, destination, departureTime,
      totalSeats, genderPreference, actualFare, city,
      distanceKm, durationMin, vehicle,
    } = req.body;

    let predictedFare = null;

    const resolvedDistanceKm = distanceKm || Math.round((haversine(origin, destination) / 1000) * 10) / 10;
    const resolvedDurationMin = durationMin || Math.max(5, Math.round(resolvedDistanceKm * 3));

    // Request ML fare prediction for ALL trip types that have a route
    if (resolvedDistanceKm) {
      const tripCity    = normalizeCity(city, req.user.city || "Kolkata");
      const depDate     = new Date(departureTime);
      const hour        = depDate.getHours();
      const dow         = depDate.getDay();
      const passengers  = totalSeats || 2;

      try {
        const mlRes = await axios.post(`${ML_API}/predict`, {
          city:           tripCity,
          distance_km:    resolvedDistanceKm,
          duration_min:   resolvedDurationMin,
          departure_hour: hour,
          day_of_week:    dow,
          traffic_index:  1.2,
          passengers,
        }, { timeout: 6000 });

        const d = mlRes.data;
        if (d.median_fare && d.lower_fare && d.upper_fare) {
          predictedFare = {
            lower:     d.lower_fare,
            median:    d.median_fare,
            upper:     d.upper_fare,
            perPerson: d.per_person_estimate || Math.ceil(d.median_fare / passengers),
            modelUsed: d.model_used || "gradient_boosting",
          };
        } else {
          throw new Error("Invalid ML response shape");
        }
      } catch (mlErr) {
        // Graceful fallback — rule-based estimate
        predictedFare = estimateFareRange({
          city:           tripCity,
          distanceKm:     resolvedDistanceKm,
          durationMin:    resolvedDurationMin,
          departureTime,
          trafficIndex:   1.2,
          passengers,
        });
        console.warn(`[ML] Fallback for ${tripCity} ${resolvedDistanceKm}km: ${mlErr.message}`);
      }
    }

    const trip = await Trip.create({
      host: req.user._id,
      tripType,
      origin,
      destination,
      departureTime: new Date(departureTime),
      totalSeats: totalSeats || 3,
      availableSeats: totalSeats || 3,
      genderPreference: genderPreference || "Any",
      actualFare,
      predictedFare,
      city: normalizeCity(city, req.user.city || "Kolkata"),
      status: tripType === "live" ? "ongoing" : "active",
      distanceKm: resolvedDistanceKm,
      durationMin: resolvedDurationMin,
      vehicle: {
        company: vehicle?.company || "Personal",
        model: vehicle?.model || "",
        licensePlate: vehicle?.licensePlate || "",
      },
    });

    await trip.populate("host", "name gender rating profilePhoto");
    res.status(201).json({ trip });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/trips - List active trips with optional filters
router.get("/", auth, async (req, res) => {
  try {
    const { city, tripType, gender } = req.query;
    const filter = { status: { $in: ["active", "ongoing"] } };
    if (city) filter.city = city;
    if (tripType) filter.tripType = tripType;
    if (gender && gender !== "Any") filter.genderPreference = { $in: ["Any", gender] };

    let trips = await Trip.find(filter)
      .populate("host", "name gender rating profilePhoto phone")
      .limit(100);

    // Sort in-memory: Keep normal chronological order for hosts with good ratings (>= 4.0),
    // but demote careless/low-rated hosts (< 4.0) to the bottom of the listings.
    trips.sort((a, b) => {
      const ratingA = a.host?.rating ?? 5.0;
      const ratingB = b.host?.rating ?? 5.0;
      
      const threshold = 4.0;
      const isBadA = ratingA < threshold;
      const isBadB = ratingB < threshold;

      if (isBadA && !isBadB) return 1;   // push A down
      if (!isBadA && isBadB) return -1;  // keep B down

      // Otherwise, sort chronologically by departure time
      return new Date(a.departureTime) - new Date(b.departureTime);
    });

    res.json({ trips: trips.slice(0, 50) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/trips/matches - Find best matches for a request
router.post("/matches", auth, async (req, res) => {
  try {
    const { origin, destination, departureTime, genderPreference } = req.body;

    const filter = { status: { $in: ["active", "ongoing"] }, availableSeats: { $gt: 0 } };
    if (genderPreference && genderPreference !== "Any") {
      filter.genderPreference = { $in: ["Any", genderPreference] };
    }

    const allTrips = await Trip.find(filter).populate("host", "name gender rating profilePhoto phone");

    const requestTrip = {
      origin,
      destination,
      departureTime,
      userGender: req.user.gender,
    };

    const matches = findTopMatches(requestTrip, allTrips, 10);
    res.json({ matches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/trips/fare-forecast - 24-hour fare prediction chart
router.post("/fare-forecast", auth, async (req, res) => {
  try {
    const { city, distanceKm, durationMin, dayOfWeek } = req.body;
    const resolvedDistanceKm = distanceKm || 5;
    const resolvedDurationMin = durationMin || Math.max(5, Math.round(resolvedDistanceKm * 3));
    const resolvedDayOfWeek = dayOfWeek !== undefined ? Number(dayOfWeek) : 1;
    const tripCity = normalizeCity(city, req?.user?.city || "Kolkata");

    const promises = [];
    for (let hour = 0; hour < 24; hour++) {
      promises.push(
        axios.post(`${ML_API}/predict`, {
          city: tripCity,
          distance_km: resolvedDistanceKm,
          duration_min: resolvedDurationMin,
          departure_hour: hour,
          day_of_week: resolvedDayOfWeek,
          traffic_index: 1.0,
          passengers: 2
        }).then(r => ({
          hour,
          fare: r.data.median_fare,
          perPerson: r.data.per_person_estimate
        })).catch(() => ({
          hour,
          fare: Math.round(30 + resolvedDistanceKm * 13 + resolvedDurationMin * 1.2),
          perPerson: Math.round((30 + resolvedDistanceKm * 13 + resolvedDurationMin * 1.2) / 2)
        }))
      );
    }

    const forecast = await Promise.all(promises);
    res.json({ forecast });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/trips/:id
router.get("/:id", auth, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id)
      .populate("host", "name gender rating profilePhoto phone emergencyContact upiId")
      .populate("passengers.user", "name gender rating profilePhoto");
    if (!trip) return res.status(404).json({ error: "Trip not found" });
    res.json({ trip });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/trips/:id/join - Request to join a trip
router.post("/:id/join", auth, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ error: "Trip not found" });
    if (trip.status !== "active") return res.status(400).json({ error: "Trip not available" });
    if (trip.availableSeats <= 0) return res.status(400).json({ error: "No seats available" });
    if (trip.host.toString() === req.user._id.toString())
      return res.status(400).json({ error: "Cannot join your own trip" });

    const alreadyJoined = trip.passengers.some(
      (p) => p.user.toString() === req.user._id.toString()
    );
    if (alreadyJoined) return res.status(400).json({ error: "Already requested to join" });

    const { pickup, dropoff } = req.body;
    trip.passengers.push({
      user: req.user._id,
      status: "pending",
      pickup: pickup || null,
      dropoff: dropoff || null
    });
    await trip.save();

    // Create Notification for Host
    await Notification.create({
      recipient: trip.host,
      sender: req.user._id,
      type: "trip_request",
      content: `${req.user.name} requested to join your trip to ${trip.destination.address.split(',')[0]}.`,
      relatedTrip: trip._id,
    });

    await trip.populate("host", "name gender rating profilePhoto phone emergencyContact upiId");
    await trip.populate("passengers.user", "name gender rating profilePhoto");
    emitTripUpdate(req, trip);
    res.json({ trip, message: "Join request sent" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/trips/:id/passenger/:userId - Accept/reject a passenger
router.put("/:id/passenger/:userId", auth, async (req, res) => {
  try {
    const { action } = req.body; // "accept" | "reject"
    const trip = await Trip.findById(req.params.id);

    if (!trip) return res.status(404).json({ error: "Trip not found" });
    if (trip.host.toString() !== req.user._id.toString())
      return res.status(403).json({ error: "Only host can manage passengers" });

    const passenger = trip.passengers.find(
      (p) => p.user.toString() === req.params.userId
    );
    if (!passenger) return res.status(404).json({ error: "Passenger not found" });

    passenger.status = action === "accept" ? "accepted" : "rejected";

    if (action === "accept") {
      trip.availableSeats = Math.max(0, trip.availableSeats - 1);
      if (trip.availableSeats === 0) trip.status = "full";
    }

    await trip.save();
    
    // Create Notification for Passenger
    await Notification.create({
      recipient: req.params.userId,
      sender: req.user._id,
      type: action === "accept" ? "trip_accepted" : "trip_rejected",
      content: `Your request to join the trip to ${trip.destination.address.split(',')[0]} was ${action}ed.`,
      relatedTrip: trip._id,
    });

    await trip.populate("host", "name gender rating profilePhoto phone emergencyContact upiId");
    await trip.populate("passengers.user", "name gender rating profilePhoto");
    emitTripUpdate(req, trip);
    res.json({ trip });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/trips/:id/fare-split - Calculate fare split
router.get("/:id/fare-split", auth, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id).populate("passengers.user", "name");
    if (!trip) return res.status(404).json({ error: "Trip not found" });

    const acceptedCount = trip.passengers.filter((p) => p.status === "accepted").length;
    const totalTravelers = acceptedCount + 1; // Host (1) + Accepted Passengers
    const fare = trip.actualFare || trip.predictedFare?.median || 0;
    
    // Proportional cost split logic
    const breakdown = [];
    let totalPassengerFares = 0;
    const isProportional = trip.distanceKm > 0 && fare > 0;
    
    if (isProportional) {
      for (const p of trip.passengers) {
        if (p.status === "accepted" && p.user) {
          let dist = trip.distanceKm;
          if (p.pickup && p.pickup.lat && p.dropoff && p.dropoff.lat) {
            dist = haversine(p.pickup, p.dropoff) / 1000;
          }
          // Cap passenger distance to host distance
          dist = Math.min(dist, trip.distanceKm);
          
          const propFare = (dist / trip.distanceKm) * fare;
          const sharedCost = Math.ceil(propFare / 2); // Less than half (50% share discount)
          
          breakdown.push({
            userId: p.user._id,
            name: p.user.name,
            distanceKm: dist,
            sharedCost
          });
          totalPassengerFares += sharedCost;
        }
      }
    }

    let perPerson = Math.ceil(fare / totalTravelers);
    let hostShare = fare - (totalTravelers - 1) * perPerson;
    let myDistanceKm = 0;

    if (isProportional) {
      const isHost = trip.host.toString() === req.user._id.toString();
      if (isHost) {
        perPerson = Math.max(0, fare - totalPassengerFares);
      } else {
        const myBreakdown = breakdown.find(b => b.userId.toString() === req.user._id.toString());
        if (myBreakdown) {
          perPerson = myBreakdown.sharedCost;
          myDistanceKm = myBreakdown.distanceKm;
        }
      }
      hostShare = Math.max(0, fare - totalPassengerFares);
    }

    res.json({
      split: {
        total: fare,
        perPerson,
        passengers: totalTravelers,
        isProportional,
        breakdown,
        hostShare,
        totalDistanceKm: trip.distanceKm,
        passengerDistanceKm: myDistanceKm
      },
      trip: { actualFare: trip.actualFare, predictedFare: trip.predictedFare }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/trips/:id/status - Update trip status (host only)
router.put("/:id/status", auth, async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ["active", "full", "ongoing", "completed", "cancelled"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ error: "Trip not found" });

    // Validate that the request is from the host
    if (trip.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Only the host can change trip status" });
    }

    // Validate transition
    const currentStatus = trip.status;
    let isValidTransition = false;

    if (currentStatus === "active" || currentStatus === "full") {
      if (status === "ongoing" || status === "cancelled" || status === "active" || status === "full") {
        isValidTransition = true;
      }
    } else if (currentStatus === "ongoing") {
      if (status === "completed" || status === "ongoing") {
        isValidTransition = true;
      }
    } else if (currentStatus === "completed" || currentStatus === "cancelled") {
      if (status === currentStatus) {
        isValidTransition = true;
      }
    }

    if (!isValidTransition) {
      return res.status(400).json({ error: `Cannot change status from ${currentStatus} to ${status}` });
    }

    trip.status = status;
    if (status === "completed" && req.body.actualFare) {
      trip.actualFare = Number(req.body.actualFare);
    }

    // Calculate and add host/passenger savings when the trip is completed
    if (status === "completed" && currentStatus !== "completed") {
      const acceptedCount = trip.passengers.filter((p) => p.status === "accepted").length;
      const fare = trip.actualFare || trip.predictedFare?.median || 0;
      const isProportional = trip.distanceKm > 0 && fare > 0;

      let hostSavings = 0;

      if (isProportional) {
        const ratePerKm = fare / trip.distanceKm;

        for (const p of trip.passengers) {
          if (p.status === "accepted") {
            let dist = trip.distanceKm;
            if (p.pickup && p.pickup.lat && p.dropoff && p.dropoff.lat) {
              dist = haversine(p.pickup, p.dropoff) / 1000;
            }
            dist = Math.min(dist, trip.distanceKm);

            const propFare = dist * ratePerKm;
            const sharedCost = Math.ceil(propFare / 2);
            const passengerSavings = Math.max(0, Math.floor(propFare - sharedCost));

            // Update Passenger in DB
            const passengerUser = await User.findById(p.user);
            if (passengerUser) {
              passengerUser.savings = (passengerUser.savings || 0) + passengerSavings;
              await passengerUser.save();
            }

            hostSavings += sharedCost;
          }
        }
      } else {
        // Fallback to equal split
        const totalTravelers = acceptedCount + 1;
        const splitFare = Math.ceil(fare / totalTravelers);
        hostSavings = fare - splitFare;

        // Update passengers
        const passengerSavings = splitFare;

        for (const p of trip.passengers) {
          if (p.status === "accepted") {
            const passengerUser = await User.findById(p.user);
            if (passengerUser) {
              passengerUser.savings = (passengerUser.savings || 0) + passengerSavings;
              await passengerUser.save();
            }
          }
        }
      }

      // Update Host in DB
      const host = await User.findById(trip.host);
      if (host) {
        host.savings = (host.savings || 0) + hostSavings;
        await host.save();
      }
    }

    await trip.save();

    // Create notifications for all accepted passengers
    const acceptedPassengers = trip.passengers.filter(p => p.status === "accepted");
    if (acceptedPassengers.length > 0) {
      let content = "";
      let type = "";

      if (status === "ongoing") {
        content = `Your trip to ${trip.destination.address.split(',')[0]} has started! 🚗`;
        type = "trip_started";
      } else if (status === "completed") {
        content = `Your trip to ${trip.destination.address.split(',')[0]} is complete. 🏁 Please coordinate splitting costs.`;
        type = "trip_completed";
      } else if (status === "cancelled") {
        content = `Your trip to ${trip.destination.address.split(',')[0]} was cancelled by the host. ❌`;
        type = "trip_cancelled";
      }

      if (content) {
        const notifications = acceptedPassengers.map(p => ({
          recipient: p.user,
          sender: req.user._id,
          type: type,
          content: content,
          relatedTrip: trip._id,
        }));
        await Notification.insertMany(notifications);
      }
    }

    await trip.populate("host", "name gender rating profilePhoto phone emergencyContact upiId");
    await trip.populate("passengers.user", "name gender rating profilePhoto");
    emitTripUpdate(req, trip);
    res.json({ trip, message: `Trip status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/trips/user/my - Get current user's trips
router.get("/user/my", auth, async (req, res) => {
  try {
    const hosted = await Trip.find({ host: req.user._id })
      .populate("passengers.user", "name gender rating")
      .sort({ createdAt: -1 });

    const joined = await Trip.find({
      "passengers.user": req.user._id,
    }).populate("host", "name gender rating profilePhoto").sort({ createdAt: -1 });

    res.json({ hosted, joined });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/trips/:id/review/status - Check if current passenger has reviewed the host
router.get("/:id/review/status", auth, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ error: "Trip not found" });

    // Check if the current user is a passenger
    const passengerEntry = trip.passengers.find(
      (p) => p.user.toString() === req.user._id.toString()
    );
    
    if (!passengerEntry || passengerEntry.status !== "accepted") {
      return res.status(403).json({ error: "Only accepted passengers can check review status" });
    }

    const review = await Review.findOne({
      trip: trip._id,
      passenger: req.user._id,
    });

    res.json({ hasReviewed: !!review });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/trips/:id/review - Submit a review for the host
router.post("/:id/review", auth, async (req, res) => {
  try {
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ error: "Trip not found" });

    if (trip.status !== "completed") {
      return res.status(400).json({ error: "Can only review hosts of completed trips" });
    }

    // Check if user is an accepted passenger
    const passengerEntry = trip.passengers.find(
      (p) => p.user.toString() === req.user._id.toString()
    );
    if (!passengerEntry || passengerEntry.status !== "accepted") {
      return res.status(403).json({ error: "Only accepted passengers can review the host" });
    }

    // Check if already reviewed
    const existingReview = await Review.findOne({
      trip: trip._id,
      passenger: req.user._id,
    });
    if (existingReview) {
      return res.status(400).json({ error: "You have already reviewed the host for this trip" });
    }

    // Save review
    const review = await Review.create({
      trip: trip._id,
      host: trip.host,
      passenger: req.user._id,
      rating: Number(rating),
      comment: comment || "",
    });

    // Update Host average rating
    const host = await User.findById(trip.host);
    if (host) {
      const currentRating = host.rating || 5.0;
      const currentTotal = host.totalRatings || 0;
      
      const newRating = ((currentRating * currentTotal) + Number(rating)) / (currentTotal + 1);
      
      host.rating = Math.round(newRating * 10) / 10; // 1 decimal place
      host.totalRatings = currentTotal + 1;
      await host.save();
    }

    res.status(201).json({ success: true, review });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/trips/:id/pay - Confirm passenger split payment and record savings
router.post("/:id/pay", auth, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ error: "Trip not found" });

    if (trip.status !== "completed") {
      return res.status(400).json({ error: "Can only confirm payment for completed trips" });
    }

    // Find the passenger entry
    const passengerEntry = trip.passengers.find(
      (p) => p.user.toString() === req.user._id.toString()
    );

    if (!passengerEntry || passengerEntry.status !== "accepted") {
      return res.status(403).json({ error: "Only accepted passengers can pay for this trip" });
    }

    if (passengerEntry.paymentStatus === "paid") {
      return res.status(400).json({ error: "You have already paid for this trip" });
    }

    // Mark as paid
    passengerEntry.paymentStatus = "paid";
    await trip.save();

    // Calculate passenger savings
    const acceptedCount = trip.passengers.filter((p) => p.status === "accepted").length;
    const totalTravelers = acceptedCount + 1;
    const fare = trip.actualFare || trip.predictedFare?.median || 0;
    const splitFare = Math.ceil(fare / totalTravelers);
    const passengerSavings = fare - splitFare;

    // Add savings to user model
    const user = await User.findById(req.user._id);
    if (user) {
      user.savings = (user.savings || 0) + passengerSavings;
      await user.save();
    }

    await trip.populate("host", "name gender rating profilePhoto phone emergencyContact upiId");
    await trip.populate("passengers.user", "name gender rating profilePhoto");
    emitTripUpdate(req, trip);
    res.json({ trip, success: true, savings: passengerSavings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
