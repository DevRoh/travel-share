import React, { useState, useEffect } from "react";
import { getMyTrips } from "../utils/api";
import TripCard from "../components/TripCard";

export default function MyTrips() {
  const [data, setData]     = useState({ hosted: [], joined: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab]       = useState("hosted");

  useEffect(() => {
    getMyTrips().then((r) => setData(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const hostedActive = data.hosted?.filter(t => t.status !== "completed" && t.status !== "cancelled") || [];
  const joinedActive = data.joined?.filter(t => t.status !== "completed" && t.status !== "cancelled") || [];
  const completedTrips = [
    ...(data.hosted || []),
    ...(data.joined || [])
  ].filter(t => t.status === "completed" || t.status === "cancelled");

  const trips = 
    tab === "hosted" ? hostedActive : 
    tab === "joined" ? joinedActive : 
    completedTrips;

  return (
    <div className="page-wrap">
      <h2 className="page-title">My Trips</h2>
      <div className="my-tabs" style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button className={`my-tab ${tab === "hosted" ? "active" : ""}`} onClick={() => setTab("hosted")} style={{ flex: 1 }}>
          🚗 Posted Trips ({hostedActive.length})
        </button>
        <button className={`my-tab ${tab === "joined" ? "active" : ""}`} onClick={() => setTab("joined")} style={{ flex: 1 }}>
          🤝 Joined Trips ({joinedActive.length})
        </button>
        <button className={`my-tab ${tab === "completed" ? "active" : ""}`} onClick={() => setTab("completed")} style={{ flex: 1 }}>
          🏁 Completed Trips ({completedTrips.length})
        </button>
      </div>
      {loading ? (
        <div style={{ textAlign: "center", color: "var(--text2)", padding: 40 }}>Loading your trips…</div>
      ) : trips.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 40 }}>
            {tab === "hosted" ? "🛣️" : tab === "joined" ? "🔍" : "🏁"}
          </div>
          <p className="text-muted" style={{ marginTop: 10 }}>
            {tab === "hosted" ? "You have no active posted trips." : 
             tab === "joined" ? "You have no active joined trips." : 
             "You have no completed trips in your history."}
          </p>
        </div>
      ) : trips.map((t) => <TripCard key={t._id} trip={t} />)}
    </div>
  );
}
