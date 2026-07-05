/**
 * Travel Sharing Coordination App - Matching Algorithms
 * Implements: Haversine distance, route overlap scoring, greedy match selection
 */

const MAX_PICKUP_DIST = 2000;  // 2 km
const MAX_DEST_DIST   = 2000;  // 2 km
const MAX_BEARING_DIFF = 90;   // degrees
const TIME_WINDOW_MS  = 60 * 60 * 1000; // 60 minutes

/**
 * Haversine distance between two lat/lng points in meters
 */
function haversine(p1, p2) {
  const R = 6371000;
  const lat1 = (p1.lat * Math.PI) / 180;
  const lat2 = (p2.lat * Math.PI) / 180;
  const dLat = lat2 - lat1;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

/**
 * Bearing from p1 -> p2 in degrees [0, 360)
 */
function bearing(p1, p2) {
  const lat1 = (p1.lat * Math.PI) / 180;
  const lat2 = (p2.lat * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const x = Math.sin(dLng) * Math.cos(lat2);
  const y =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(x, y) * 180) / Math.PI + 360) % 360;
}

/**
 * Route overlap score [0,1] between two trips
 */
function routeOverlapScore(o1, d1, o2, d2) {
  const pickupDist = haversine(o1, o2);
  const destDist   = haversine(d1, d2);
  const b1 = bearing(o1, d1);
  const b2 = bearing(o2, d2);
  let bDiff = Math.abs(b1 - b2);
  if (bDiff > 180) bDiff = 360 - bDiff;

  const pickupScore  = Math.max(0, 1 - pickupDist / MAX_PICKUP_DIST);
  const destScore    = Math.max(0, 1 - destDist / MAX_DEST_DIST);
  const bearingScore = Math.max(0, 1 - bDiff / MAX_BEARING_DIFF);

  return 0.4 * pickupScore + 0.3 * destScore + 0.3 * bearingScore;
}

/**
 * Compute final match score for a candidate trip against the requesting trip
 */
function computeMatchScore(requestTrip, candidateTrip, weights = {}) {
  const w = {
    overlap: 0.50,
    time: 0.20,
    pickup: 0.20,
    preference: 0.10,
    ...weights,
  };

  const HO = candidateTrip.origin;
  const HD = candidateTrip.destination;
  const JO = requestTrip.origin;
  const JD = requestTrip.destination;

  // 1. Route overlap (Detour based)
  const hostOriginalDist = haversine(HO, HD);
  const distWithJoiner = haversine(HO, JO) + haversine(JO, JD) + haversine(JD, HD);
  const detourMeters = Math.max(0, distWithJoiner - hostOriginalDist);
  
  const MAX_DETOUR = 10000; // 10 km detour for flexible, non-rigid routing
  const overlapScore = Math.max(0, 1 - detourMeters / MAX_DETOUR);

  // 2. Time proximity
  const timeDiff = Math.abs(
    new Date(requestTrip.departureTime) - new Date(candidateTrip.departureTime)
  );
  const timeScore =
    timeDiff > TIME_WINDOW_MS ? 0 : 1 - timeDiff / TIME_WINDOW_MS;

  // 3. Pickup and Dropoff proximity
  const pickupDist = haversine(HO, JO);
  const destDist   = haversine(HD, JD);
  const pickupScore = Math.max(0, 1 - pickupDist / MAX_PICKUP_DIST);

  // 4. Exact vs Overlap type
  const matchType = destDist < 2000 ? "exact" : "overlap";

  // 4. Gender preference
  let preferenceScore = 1;
  if (
    candidateTrip.genderPreference !== "Any" &&
    requestTrip.userGender &&
    candidateTrip.genderPreference !== requestTrip.userGender
  ) {
    preferenceScore = 0;
  }

  const finalScore =
    w.overlap * overlapScore +
    w.time * timeScore +
    w.pickup * pickupScore +
    w.preference * preferenceScore;

  return {
    finalScore: Math.round(finalScore * 100) / 100,
    overlapScore: Math.round(overlapScore * 100) / 100,
    timeScore: Math.round(timeScore * 100) / 100,
    pickupScore: Math.round(pickupScore * 100) / 100,
    preferenceScore,
    pickupDistanceM: Math.round(pickupDist),
    dropoffDistanceM: Math.round(destDist),
    detourM: Math.round(detourMeters),
    matchType,
  };
}

/**
 * Find top K matches from candidates
 */
function findTopMatches(requestTrip, candidates, k = 5) {
  const scored = candidates
    .filter((c) => c._id.toString() !== (requestTrip._id || "").toString())
    .filter((c) => ["active", "ongoing"].includes(c.status) && c.availableSeats > 0)
    .map((c) => {
      const scores = computeMatchScore(requestTrip, c);
      return { trip: c, ...scores };
    })
    .filter((r) => {
      // 1. Must not require extreme walking to pickup (Relaxed to 8km for testing)
      if (r.pickupDistanceM > 8000) return false;
      
      // 2. Must not require extreme host detour (Relaxed to 10km for testing)
      if (r.detourM > 10000) return false;

      // 3. Enforce strict maximum pickup distance if either trip is LIVE (Relaxed to 5km for testing)
      if ((requestTrip.tripType === "live" || r.trip.tripType === "live") && r.pickupDistanceM > 5000) {
        return false;
      }

      // 4. Score must be reasonably positive to be considered a recommendation (Relaxed to 0.1)
      return r.finalScore >= 0.1;
    })
    .sort((a, b) => {
      if (a.pickupDistanceM !== b.pickupDistanceM) {
        return a.pickupDistanceM - b.pickupDistanceM; // Closest host pickup point first (ascending order)
      }
      return b.finalScore - a.finalScore; // Tie breaker: highest overlap match score first
    })
    .slice(0, k);

  return scored;
}

/**
 * Simple cost split: divide fare equally
 */
function calculateCostSplit(totalFare, passengers) {
  const perPerson = Math.ceil(totalFare / passengers);
  return { total: totalFare, perPerson, passengers };
}

module.exports = {
  haversine,
  bearing,
  routeOverlapScore,
  computeMatchScore,
  findTopMatches,
  calculateCostSplit,
};
