const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  trip: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", required: true },
  host: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  passenger: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Review", reviewSchema);
