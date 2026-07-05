import React, { useState, useEffect } from "react";
import { getTrips, findMatches } from "../utils/api";
import { useAuth } from "../utils/AuthContext";
import TripCard from "../components/TripCard";
import AddressSelectorMap from "../components/AddressSelectorMap";

export default function BrowseTrips() {
  const { user } = useAuth();
  const [trips, setTrips]     = useState([]);
  const [matches, setMatches] = useState(null); // null means no search done yet
  const [loading, setLoading] = useState(true);
  const [matchLoading, setMatchLoading] = useState(false);

  const [matchForm, setMatchForm] = useState({
    originAddress: "", originLat: "", originLng: "",
    destAddress: "", destLat: "", destLng: "",
    departureTime: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
    genderPreference: "Any",
  });

  useEffect(() => {
    // Load default recent trips
    setLoading(true);
    getTrips({ city: user?.city || "Kolkata" })
      .then((r) => setTrips(r.data.trips))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const handleMatch = async (e) => {
    e.preventDefault();
    setMatchLoading(true);
    try {
      const origin = { lat: parseFloat(matchForm.originLat) || 22.5726, lng: parseFloat(matchForm.originLng) || 88.4145, address: matchForm.originAddress };
      const destination = { lat: parseFloat(matchForm.destLat)   || 22.5514, lng: parseFloat(matchForm.destLng)   || 88.3517, address: matchForm.destAddress };
      
      localStorage.setItem("ts_last_search_pickup", JSON.stringify(origin));
      localStorage.setItem("ts_last_search_dropoff", JSON.stringify(destination));

      const res = await findMatches({
        origin,
        destination,
        departureTime: matchForm.departureTime,
        genderPreference: matchForm.genderPreference,
      });
      setMatches(res.data.matches);
    } catch (e) { console.error(e); }
    finally { setMatchLoading(false); }
  };

  const mfc = (e) => setMatchForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  return (
    <div className="page-wrap">
      <h2 className="page-title">Find a Ride</h2>
      <p className="page-sub" style={{ marginBottom: 20 }}>Enter your route to find the best overlapping hosts to merge with.</p>

      {/* Hero Search Box */}
      <div className="match-form-box" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "24px", marginBottom: "30px", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
        <form onSubmit={handleMatch}>
          
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>Origin</label>
              <AddressSelectorMap 
                label="Origin" 
                onLocationSelect={(loc) => setMatchForm(f => ({ ...f, originLat: loc.lat, originLng: loc.lng, originAddress: loc.address }))} 
              />
              <input name="originAddress" placeholder="Or type landmark manually" value={matchForm.originAddress} onChange={mfc} required style={{ marginTop: 8 }} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Destination</label>
              <AddressSelectorMap 
                label="Destination" 
                onLocationSelect={(loc) => setMatchForm(f => ({ ...f, destLat: loc.lat, destLng: loc.lng, destAddress: loc.address }))} 
              />
              <input name="destAddress" placeholder="Or type landmark manually" value={matchForm.destAddress} onChange={mfc} required style={{ marginTop: 8 }} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>Departure Time</label>
              <input type="datetime-local" name="departureTime" value={matchForm.departureTime} onChange={mfc} required />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Gender Preference</label>
              <select name="genderPreference" value={matchForm.genderPreference} onChange={mfc}>
                <option value="Any">Any</option><option value="Male">Male only</option><option value="Female">Female only</option>
              </select>
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-full" style={{ padding: 14, fontSize: "16px", marginTop: 8 }} disabled={matchLoading}>
            {matchLoading ? "Scanning routes & calculating detours..." : "🎯 Search Best Matches"}
          </button>
        </form>
      </div>

      {/* Results Area */}
      {matches ? (
        <div className="fade-in">
          <div className="section-hdr">
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20, margin: 0 }}>
              {matches.length} Top Match{matches.length !== 1 ? "es" : ""}
            </h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setMatches(null)}>Clear Search</button>
          </div>
          {matches.length === 0 ? (
            <div className="empty-state"><div style={{ fontSize: 40 }}>🚫</div><p className="text-muted" style={{ marginTop: 10 }}>No trips perfectly match your route. Try a different time or post your own trip!</p></div>
          ) : (
            matches.map((m) => (
              <div key={m.trip._id} style={{ marginBottom: "20px" }}>
                <div className="match-meta" style={{ display: "flex", justifyContent: "space-between", background: "rgba(0,200,150,0.1)", border: "1px solid rgba(0,200,150,0.2)", padding: "10px 14px", borderRadius: "10px 10px 0 0", borderBottom: "none" }}>
                  <div style={{ fontWeight: "bold", color: "#00c896", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>{m.finalScore >= 0.8 ? "🔥 Highly Recommended" : "👍 Good Match"}</span>
                    <span style={{ fontSize: 11, background: "rgba(0,0,0,0.2)", padding: "2px 6px", borderRadius: "10px", marginLeft: "8px" }}>
                      {m.matchType === "exact" ? "🎯 Exact Route" : "📍 Drop-off on the way"}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text)", display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ color: "#f59e0b" }}>🚗 Host Detour: {m.detourM}m</span>
                    <span>•</span>
                    <span>🚶 Pickup: {m.pickupDistanceM}m away</span>
                  </div>
                </div>
                <div style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0, overflow: "hidden" }}>
                  <TripCard trip={m.trip} matchScore={m.finalScore} />
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="fade-in">
          <div className="empty-state">
            <div style={{ fontSize: 40, marginBottom: 12 }}>🛣️</div>
            <p className="text-muted text-sm">Enter your origin and destination above to see the best overlapping trips.</p>
          </div>
        </div>
      )}
    </div>
  );
}
