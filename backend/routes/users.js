const express = require("express");
const User    = require("../models/User");
const Trip    = require("../models/Trip");
const auth    = require("../middleware/auth");

const router = express.Router();

// POST /api/users/:id/rate  — rate a user after a shared trip
router.post("/:id/rate", auth, async (req, res) => {
  try {
    const { rating, tripId } = req.body;
    if (!rating || rating < 1 || rating > 5)
      return res.status(400).json({ error: "Rating must be 1–5" });

    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ error: "User not found" });
    if (target._id.toString() === req.user._id.toString())
      return res.status(400).json({ error: "Cannot rate yourself" });

    // Verify they shared a trip
    if (tripId) {
      const trip = await Trip.findById(tripId);
      const participated =
        trip &&
        (trip.host.toString() === req.params.id ||
          trip.passengers.some(
            (p) => p.user.toString() === req.params.id && p.status === "accepted"
          ));
      if (!participated)
        return res.status(403).json({ error: "Can only rate co-travelers from a completed trip" });
    }

    // Update rolling average
    const newTotal = target.totalRatings + 1;
    const newRating =
      (target.rating * target.totalRatings + parseFloat(rating)) / newTotal;

    target.rating       = Math.round(newRating * 10) / 10;
    target.totalRatings = newTotal;
    await target.save();

    res.json({ message: "Rating submitted", newRating: target.rating });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users/:id/report  — report a user for unsafe behavior
router.post("/:id/report", auth, async (req, res) => {
  try {
    const { reason, tripId } = req.body;
    if (!reason) return res.status(400).json({ error: "Reason required" });

    // In a production system this would store a Report document
    // and notify an admin. For now we log and acknowledge.
    console.warn(`🚨 Report: ${req.user.name} reported user ${req.params.id} | Reason: ${reason} | Trip: ${tripId || "N/A"}`);

    res.json({ message: "Report submitted. Our team will review it." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/:id/public — get public profile
router.get("/:id/public", auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("name gender rating totalRatings city profilePhoto createdAt");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
