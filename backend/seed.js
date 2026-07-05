/**
 * Seed script — populates MongoDB with demo users and trips
 * Run: node seed.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const User     = require("./models/User");
const Trip     = require("./models/Trip");
const Message  = require("./models/Message");

const MONGO = process.env.MONGODB_URI || "mongodb://localhost:27017/travelshare";

const DEMO_USERS = [
  { name: "Soumyadip Pal",   email: "soumyadip@demo.com", phone: "9876543210", password: "demo123", gender: "Male",   city: "Kolkata",   rating: 4.8 },
  { name: "Rohit Paul",      email: "rohit@demo.com",     phone: "9876543211", password: "demo123", gender: "Male",   city: "Kolkata",   rating: 4.6 },
  { name: "Saptarshi Ghosh", email: "saptarshi@demo.com", phone: "9876543212", password: "demo123", gender: "Male",   city: "Delhi",     rating: 4.9 },
  { name: "Priya Sharma",    email: "priya@demo.com",     phone: "9876543213", password: "demo123", gender: "Female", city: "Mumbai",    rating: 4.7 },
  { name: "Ananya Roy",      email: "ananya@demo.com",    phone: "9876543214", password: "demo123", gender: "Female", city: "Kolkata",   rating: 5.0 },
  { name: "Jitendrio Saha",  email: "jitendrio@demo.com", phone: "9876543215", password: "demo123", gender: "Male",   city: "Bengaluru", rating: 4.5 },
];

// Sample Kolkata coordinates (real landmarks)
const KOLKATA_ROUTES = [
  { originAddr: "Salt Lake Sector V", oLat: 22.5726, oLng: 88.4145, destAddr: "Park Street", dLat: 22.5514, dLng: 88.3517 },
  { originAddr: "Dum Dum Airport",    oLat: 22.6532, oLng: 88.4463, destAddr: "New Town Rajarhat", dLat: 22.5826, dLng: 88.4839 },
  { originAddr: "Howrah Station",     oLat: 22.5839, oLng: 88.3421, destAddr: "Salt Lake City", dLat: 22.5726, dLng: 88.4145 },
  { originAddr: "Esplanade",          oLat: 22.5626, dLng: 88.3503, destAddr: "Jadavpur", dLat: 22.4997, dLng: 88.3720, oLng: 88.3503 },
  { originAddr: "Behala",             oLat: 22.4983, oLng: 88.3030, destAddr: "Tollygunge",  dLat: 22.4973, dLng: 88.3510 },
];

async function seed() {
  await mongoose.connect(MONGO);
  console.log("✅ Connected to MongoDB:", MONGO);

  // Clear existing demo data
  await Promise.all([
    User.deleteMany({ email: { $in: DEMO_USERS.map((u) => u.email) } }),
    Trip.deleteMany({ city: { $in: ["Kolkata", "Delhi", "Mumbai", "Bengaluru"] } }),
    Message.deleteMany({}),
  ]);
  console.log("🗑️  Cleared existing demo data");

  // Create users
  const users = await User.insertMany(
    DEMO_USERS.map((u) => ({
      ...u,
      isVerified: true,
      emergencyContact: { name: "Parent", phone: "9000000000" },
    }))
  );
  // Re-hash passwords via save
  for (const user of users) {
    const plain = DEMO_USERS.find((d) => d.email === user.email).password;
    user.password = plain;
    await user.save();
  }
  console.log(`👥 Created ${users.length} demo users`);

  const kolUsers = users.filter((u) => u.city === "Kolkata");

  // Create trips
  const now = new Date();
  const trips = [];

  // Live trip
  trips.push({
    host: kolUsers[0]._id,
    tripType: "live",
    origin:      { lat: KOLKATA_ROUTES[0].oLat, lng: KOLKATA_ROUTES[0].oLng, address: KOLKATA_ROUTES[0].originAddr },
    destination: { lat: KOLKATA_ROUTES[0].dLat, lng: KOLKATA_ROUTES[0].dLng, address: KOLKATA_ROUTES[0].destAddr },
    departureTime: new Date(now.getTime() + 15 * 60000),
    totalSeats: 3, availableSeats: 2,
    actualFare: 220,
    genderPreference: "Any",
    city: "Kolkata", status: "active",
  });

  // Need partner
  trips.push({
    host: kolUsers[1]._id,
    tripType: "need_partner",
    origin:      { lat: KOLKATA_ROUTES[1].oLat, lng: KOLKATA_ROUTES[1].oLng, address: KOLKATA_ROUTES[1].originAddr },
    destination: { lat: KOLKATA_ROUTES[1].dLat, lng: KOLKATA_ROUTES[1].dLng, address: KOLKATA_ROUTES[1].destAddr },
    departureTime: new Date(now.getTime() + 30 * 60000),
    totalSeats: 2, availableSeats: 1,
    genderPreference: "Any",
    city: "Kolkata", status: "active",
  });

  // Scheduled trips
  for (let i = 2; i < KOLKATA_ROUTES.length; i++) {
    const r = KOLKATA_ROUTES[i];
    trips.push({
      host: users[i % users.length]._id,
      tripType: "scheduled",
      origin:      { lat: r.oLat, lng: r.oLng, address: r.originAddr },
      destination: { lat: r.dLat, lng: r.dLng, address: r.destAddr },
      departureTime: new Date(now.getTime() + (i * 2 + 1) * 60 * 60000),
      totalSeats: 3, availableSeats: 3,
      genderPreference: i % 3 === 0 ? "Female" : "Any",
      city: "Kolkata",
      distanceKm: 6 + i * 1.5,
      durationMin: 20 + i * 4,
      predictedFare: { lower: 130 + i * 20, median: 165 + i * 20, upper: 200 + i * 20 },
      status: "active",
    });
  }

  const createdTrips = await Trip.insertMany(trips);
  console.log(`🚗 Created ${createdTrips.length} demo trips`);

  // Add a passenger to first trip
  const firstTrip = createdTrips[0];
  firstTrip.passengers.push({ user: kolUsers[1]._id, status: "accepted" });
  firstTrip.availableSeats = 1;
  await firstTrip.save();

  // Seed some messages
  const msgs = [
    { trip: firstTrip._id, sender: kolUsers[0]._id, text: "Hey! I'm heading from Salt Lake to Park Street. Want to share the cab?" },
    { trip: firstTrip._id, sender: kolUsers[1]._id, text: "Yes! I'm also going to Park Street. Where exactly should I meet you?" },
    { trip: firstTrip._id, sender: kolUsers[0]._id, text: "Let's meet at the Sector V Metro gate, 5 mins from now." },
    { trip: firstTrip._id, sender: kolUsers[1]._id, text: "Perfect! I can see you. The cab fare shows ₹220 — split is ₹110 each, right?" },
    { trip: firstTrip._id, sender: kolUsers[0]._id, text: "Exactly! See you in a bit 🚗" },
  ];
  await Message.insertMany(msgs);
  console.log(`💬 Created ${msgs.length} demo messages`);

  console.log("\n✅ Seed complete!");
  console.log("\n🔑 Demo Login Credentials:");
  DEMO_USERS.forEach((u) => console.log(`   ${u.email} / ${u.password}  (${u.city})`));

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => { console.error("❌ Seed failed:", err); process.exit(1); });
