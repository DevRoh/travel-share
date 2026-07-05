const Trip = require("../models/Trip");
const User = require("../models/User");
const Review = require("../models/Review");

async function runTripCleanup() {
  try {
    const now = new Date();
    
    // Find all trips in non-terminal states
    const activeTrips = await Trip.find({
      status: { $in: ["active", "full", "ongoing"] }
    });

    let autoCompletedCount = 0;
    let deletedCount = 0;

    for (const trip of activeTrips) {
      const duration = Number(trip.durationMin) || 30; // default 30 mins
      const departure = new Date(trip.departureTime);
      
      // Reach time + 2 hours buffer
      const thresholdTime = new Date(departure.getTime() + (duration * 60 * 1000) + (2 * 60 * 60 * 1000));
      
      if (now > thresholdTime) {
        if (trip.status === "ongoing") {
          // Started but never completed -> auto-complete and penalize host
          trip.status = "completed";
          await trip.save();

          // Create 1-star auto-penalty review
          await Review.create({
            trip: trip._id,
            host: trip.host,
            rating: 1,
            comment: "System Auto-Penalty: Host forgot to mark the trip as completed on time."
          });

          // Update host rating in User model
          const host = await User.findById(trip.host);
          if (host) {
            const currentRating = host.rating || 5.0;
            const currentTotal = host.totalRatings || 0;
            const newRating = ((currentRating * currentTotal) + 1) / (currentTotal + 1);
            
            host.rating = Math.round(newRating * 10) / 10;
            host.totalRatings = currentTotal + 1;
            await host.save();
          }

          console.log(`[CLEANUP] Host ${trip.host} penalized. Trip ${trip._id} auto-completed.`);
          autoCompletedCount++;
        } else if (trip.status === "active" || trip.status === "full") {
          // Never started -> delete automatically
          await Trip.findByIdAndDelete(trip._id);
          console.log(`[CLEANUP] Deleted abandoned trip ${trip._id} (Departure + reach window passed).`);
          deletedCount++;
        }
      }
    }

    if (autoCompletedCount > 0 || deletedCount > 0) {
      console.log(`[CLEANUP RUN] Auto-completed: ${autoCompletedCount}, Deleted: ${deletedCount}`);
    }
  } catch (err) {
    console.error("[CLEANUP ERROR] Failed to run trip cleanup script:", err);
  }
}

module.exports = { runTripCleanup };
