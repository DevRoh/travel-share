# 🚗 Travel Sharing Coordination App

**By:** Soumyadip Pal · Rohit Paul · Saptarshi Ghosh · Jitendrio Saha  
**Guide:** Prof. Subir Hazra  
**Institute:** Meghnad Saha Institute of Technology, Dept. of IT

---

## 📖 Overview

A peer-to-peer travel coordination platform enabling students and commuters to:
- Share ongoing cab rides and split costs
- Find co-travelers going the same direction
- Schedule future trips with ML-based fare estimates
- Chat and coordinate securely in-app

**Not a ride-hailing service** — purely a coordination tool.

---

## 🏗️ Architecture

```
travel-share/
├── frontend/          → React.js (Port 3000)
│   ├── src/
│   │   ├── pages/     → Login, Register, Dashboard, PostTrip, BrowseTrips,
│   │   │                 TripDetail, MyTrips, Profile
│   │   ├── components/ → Navbar, TripCard
│   │   └── utils/     → api.js, AuthContext, SocketContext
│   └── public/
│
├── backend/           → Node.js + Express + Socket.IO (Port 5005)
│   ├── server.js      → Main server + Socket.IO real-time chat
│   ├── models/        → User, Trip, Message (MongoDB/Mongoose)
│   ├── routes/        → auth, trips, chat
│   ├── middleware/    → JWT auth
│   └── utils/         → matching.js (Haversine, scoring algorithms)
│
└── ml/                → Python Flask ML API (Port 5001)
    ├── generate_dataset.py  → Synthetic data + model training
    ├── api/app.py           → Flask REST API
    ├── models/              → Saved .pkl model files (auto-generated)
    ├── data/                → Dataset CSV (auto-generated)
    └── requirements.txt
```

---

## ⚙️ Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18+ |
| npm | 9+ |
| Python | 3.9+ |
| MongoDB | 6+ (local or Atlas) |

---

## 🚀 Setup Instructions

### Step 1 — Clone / Download
```bash
cd travel-share
```

### Step 2 — ML Service Setup
```bash
cd ml

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Mac/Linux
# venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt

# Generate dataset and train models (takes ~1–2 min)
python generate_dataset.py

# Start ML API server
python api/app.py
# → Running on http://localhost:5001
```

> ✅ After running `generate_dataset.py`, you'll see `models/` and `data/` folders created.

### Step 3 — Backend Setup
```bash
cd ../backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env:
#   MONGODB_URI=mongodb://localhost:27017/travelshare
#   JWT_SECRET=your_secret_key_here
#   ML_API_URL=http://localhost:5001

# Start backend
npm run dev
# → Running on http://localhost:5005
```

### Step 4 — Frontend Setup
```bash
cd ../frontend

# Install dependencies
npm install

# Start React dev server
npm start
# → Running on http://localhost:3000
```

### Step 5 — Open the App
Visit `http://localhost:3000` in your browser.

**Register a new account** → You're in!

---

## 🔑 Environment Variables

### backend/.env
```
PORT=5005
MONGODB_URI=mongodb://localhost:27017/travelshare
JWT_SECRET=change_this_to_a_long_random_secret
ML_API_URL=http://localhost:5001
NODE_ENV=development
```

### frontend/.env (optional)
```
REACT_APP_API_URL=http://localhost:5005/api
REACT_APP_ML_URL=http://localhost:5001
REACT_APP_SOCKET_URL=http://localhost:5005
```

---

## 🧠 ML Model Details

### Dataset
- **20,000 records** across 4 cities: Kolkata, Delhi, Mumbai, Bengaluru
- **11 features** per record: distance_km, duration_min, departure_hour, day_of_week, traffic_index, surge_flag, fuel_price, base_fare, city

### Models Trained
| Model | Typical MAE | Notes |
|-------|------------|-------|
| Linear Regression | ~₹28 | Baseline |
| Random Forest | ~₹18 | Good for non-linear patterns |
| Gradient Boosting | ~₹15 | **Best — deployed** |

### API Endpoints

#### ML API (port 5001)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/predict` | POST | Predict fare range (lower/median/upper) |
| `/route-overlap` | POST | Calculate route overlap score |
| `/cities` | GET | Supported cities |
| `/health` | GET | Health check |

#### Backend API (port 5005)
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/register` | POST | No | Register user |
| `/api/auth/login` | POST | No | Login |
| `/api/auth/me` | GET | Yes | Get current user |
| `/api/auth/profile` | PUT | Yes | Update profile |
| `/api/trips` | POST | Yes | Create trip |
| `/api/trips` | GET | Yes | List trips (filters) |
| `/api/trips/matches` | POST | Yes | Find matching trips |
| `/api/trips/:id` | GET | Yes | Trip details |
| `/api/trips/:id/join` | POST | Yes | Request to join |
| `/api/trips/:id/passenger/:uid` | PUT | Yes | Accept/reject passenger |
| `/api/trips/:id/fare-split` | GET | Yes | Cost breakdown |
| `/api/trips/user/my` | GET | Yes | My trips |
| `/api/chat/:tripId` | GET | Yes | Get messages |
| `/api/chat/:tripId` | POST | Yes | Send message |

---

## 🎯 Key Algorithms

### 1. Haversine Distance
Calculates geodesic distance between two GPS coordinates in meters.

### 2. Route Overlap Score
```
overlap = 0.40 × pickupScore
        + 0.30 × destScore
        + 0.30 × bearingScore
```
Returns a value in [0, 1].

### 3. Match Scoring
```
finalScore = 0.40 × overlapScore
           + 0.30 × timeScore
           + 0.20 × pickupScore
           + 0.10 × preferenceScore
```

### 4. Cost Estimation (ML)
```
base = baseFare + distance × perKm + duration × perMin
adjusted = base × surgeMultiplier × trafficIndex
lower  = adjusted × 0.85
median = adjusted
upper  = adjusted × 1.20
```

---

## 🔌 Real-Time Features (Socket.IO)

| Event | Direction | Description |
|-------|-----------|-------------|
| `join_trip` | Client→Server | Join a trip chat room |
| `send_message` | Client→Server | Send a chat message |
| `new_message` | Server→Client | Broadcast new message |
| `location_update` | Client→Server | Share live GPS |
| `partner_location` | Server→Client | Receive partner GPS |
| `join_city` | Client→Server | Subscribe to city trip alerts |

---

## 🗂️ MongoDB Collections

### users
```json
{
  "name": "Soumyadip Pal",
  "email": "soumyadip@example.com",
  "phone": "+91 9876543210",
  "gender": "Male",
  "city": "Kolkata",
  "rating": 4.8,
  "emergencyContact": { "name": "...", "phone": "..." }
}
```

### trips
```json
{
  "host": "<userId>",
  "tripType": "scheduled",
  "origin": { "lat": 22.5726, "lng": 88.3639, "address": "Salt Lake" },
  "destination": { "lat": 22.55, "lng": 88.35, "address": "Park Street" },
  "departureTime": "2025-12-15T09:00:00Z",
  "totalSeats": 3,
  "availableSeats": 2,
  "predictedFare": { "lower": 160, "median": 190, "upper": 228 },
  "genderPreference": "Any",
  "city": "Kolkata"
}
```

### messages
```json
{
  "trip": "<tripId>",
  "sender": "<userId>",
  "text": "Hey! Where should I meet you?",
  "createdAt": "..."
}
```

---

## 🚧 Known Limitations & Future Work

1. **GPS simulation** — Coordinates entered manually; integrate Leaflet/Google Maps for real-time GPS
2. **Push notifications** — Add FCM/web-push for real trip match alerts
3. **OTP verification** — Integrate Twilio/MSG91 for phone OTP
4. **Payment split** — Add UPI deep-links (Google Pay/PhonePe) for easy payment
5. **Mobile app** — Port to React Native for iOS/Android
6. **Map routing** — Integrate OpenRouteService or Google Maps Directions API

---

## 👥 Team

| Name | Roll No | Registration |
|------|---------|--------------|
| Soumyadip Pal | 14200222047 | 221420110509 |
| Rohit Paul | 14200222051 | 221420110496 |
| Saptarshi Ghosh | 14200222061 | 221420110500 |
| Jitendrio Saha | 14200222043 | 221420110483 |

**Guide:** Prof. Subir Hazra  
**Institute:** MSIT, Dept. of IT — Dec 2025
