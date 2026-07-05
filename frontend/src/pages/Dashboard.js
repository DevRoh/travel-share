import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getTrips, getMyTrips, getMe } from "../utils/api";
import { useAuth } from "../utils/AuthContext";
import TripCard from "../components/TripCard";

export default function Dashboard() {
  const { user, setUser }  = useAuth();
  const navigate  = useNavigate();
  const [trips, setTrips]   = useState([]);
  const [myTrips, setMyTrips] = useState({ hosted: [], joined: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe().then((res) => setUser(res.data.user)).catch(console.error);
    Promise.all([getTrips({ city: user?.city }), getMyTrips()])
      .then(([t, m]) => { setTrips(t.data.trips.slice(0, 4)); setMyTrips(m.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.city, setUser]);

  const stats = [
    { icon: "🚗", label: "Active Trips",  value: trips.length,                   color: "#00c896" },
    { icon: "📅", label: "My Posted",     value: myTrips.hosted?.length || 0,    color: "#0084ff" },
    { icon: "🤝", label: "Trips Joined",  value: myTrips.joined?.length || 0,    color: "#ff6b35" },
    { icon: "💰", label: "Est. Saved",    value: `₹${user?.savings || 0}`,        color: "#f59e0b" },
  ];

  const actions = [
    { icon: "🔴", label: "I'm riding now",        sub: "Inside a cab, split the cost",         path: "/post-trip?type=live",         color: "#ff6b35" },
    { icon: "🔵", label: "Need a ride partner",   sub: "Looking for someone to travel with",   path: "/post-trip?type=need_partner",  color: "#0084ff" },
    { icon: "🟢", label: "Schedule a future trip",sub: "Plan ahead, share travel costs with others",path: "/post-trip?type=scheduled",    color: "#00c896" },
    { icon: "🔍", label: "Browse & match trips",  sub: "Find trips that match your route",      path: "/trips",                        color: "#8b5cf6" },
  ];

  return (
    <div className="page-wrap">
      {/* Welcome */}
      <div className="welcome-row">
        <div>
          <h1 className="welcome-title">Hey, {user?.name?.split(" ")[0]} 👋</h1>
          <p className="text-muted">Ready to share your next trip?</p>
        </div>
        <div className="city-badge">📍 {user?.city || "Kolkata"}</div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {stats.map((s) => (
          <div key={s.label} className="stat-card" style={{ borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: 24 }}>{s.icon}</div>
            <div className="stat-val" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <h2 className="section-title">What do you need?</h2>
      <div className="actions-grid">
        {actions.map((a) => (
          <div key={a.label} className="action-card" style={{ borderLeft: `3px solid ${a.color}` }} onClick={() => navigate(a.path)}>
            <span style={{ fontSize: 28 }}>{a.icon}</span>
            <div className="action-label">{a.label}</div>
            <div className="action-sub">{a.sub}</div>
            <span className="action-arrow" style={{ color: a.color }}>→</span>
          </div>
        ))}
      </div>

    </div>
  );
}
