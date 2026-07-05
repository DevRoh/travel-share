const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  address: { type: String, default: "" },
});

const tripSchema = new mongoose.Schema({
  host: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  
  // Trip type
  tripType: {
    type: String,
    enum: ["live", "need_partner", "scheduled"],
    required: true,
  },
  
  // Locations
  origin: { type: locationSchema, required: true },
  destination: { type: locationSchema, required: true },
  
  // Time
  departureTime: { type: Date, required: true },
  
  // Capacity
  totalSeats: { type: Number, default: 3, min: 1, max: 6 },
  availableSeats: { type: Number, default: 3 },
  
  // Passengers
  passengers: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
    joinedAt: { type: Date, default: Date.now },
    paymentStatus: { type: String, enum: ["unpaid", "paid"], default: "unpaid" },
    pickup: {
      lat: Number,
      lng: Number,
      address: String
    },
    dropoff: {
      lat: Number,
      lng: Number,
      address: String
    }
  }],
  
  // Fare (for live trips where fare is known)
  actualFare: { type: Number },
  
  // ML Predicted fare (for scheduled trips)
  predictedFare: {
    lower: Number,
    median: Number,
    upper: Number,
    perPerson: Number,
    surge: Number,
    modelUsed: String,
  },
  
  // Preferences
  genderPreference: { type: String, enum: ["Any", "Male", "Female"], default: "Any" },
  
  // City
  city: { type: String, default: "Kolkata" },
  
  // Status
  status: {
    type: String,
    enum: ["active", "full", "ongoing", "completed", "cancelled"],
    default: "active",
  },
  
  // Vehicle Details
  vehicle: {
    company: { type: String, default: "Personal" },
    model: { type: String, default: "" },
    licensePlate: { type: String, default: "" },
  },
  
  // Trip distance/duration (estimated)
  distanceKm: Number,
  durationMin: Number,
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Update updatedAt on save
tripSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Index for geospatial-ish queries (lat/lng stored flat for simplicity)
tripSchema.index({ "origin.lat": 1, "origin.lng": 1 });
tripSchema.index({ status: 1, departureTime: 1 });

module.exports = mongoose.model("Trip", tripSchema);
