import React, { useState, useEffect } from "react";
import { getTrips, getMyTrips } from "../utils/api";
import { useAuth } from "../utils/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

export default function Admin() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");
  const [trips, setTrips]   = useState([]);
  const [users, setUsers]   = useState([]);
  const [stats, setStats]   = useState({ total: 0, active: 0, completed: 0, live: 0, scheduled: 0, need_partner: 0 });
  const [loading, setLoading] = useState(true);

  // Simple admin gate: check by email (in production use a role field)
  const ADMIN_EMAIL = "johndoe@demo.com";
  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (!isAdmin) return;
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      axios.get(`${API_BASE}/trips`, { headers }),
    ]).then(([tripsRes]) => {
      const t = tripsRes.data.trips || [];
      setTrips(t);
      setStats({
        total:       t.length,
        active:      t.filter(x => x.status === "active").length,
        completed:   t.filter(x => x.status === "completed").length,
        live:        t.filter(x => x.tripType === "live").length,
        scheduled:   t.filter(x => x.tripType === "scheduled").length,
        need_partner:t.filter(x => x.tripType === "need_partner").length,
      });
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [isAdmin, token]);

  if (!isAdmin) {
    return (
      <div style={styles.noAccess}>
        <div style={{ fontSize: 48 }}>🔒</div>
        <h2 style={{ fontFamily: "var(--font-display)", margin: "12px 0" }}>Admin Access Only</h2>
        <p className="text-muted">This page is restricted to administrators.</p>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const TABS = [
    { id: "overview",  label: "📊 Overview" },
    { id: "trips",     label: "🚗 Trips" },
    { id: "system",    label: "⚙️ System" },
  ];

  const formatTime = (d) => new Date(d).toLocaleString("en-IN", { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" });

  const TYPE_COLOR = { live: "#ff6b35", need_partner: "#0084ff", scheduled: "#00c896" };
  const STATUS_COLOR = { active: "#00c896", full: "#f59e0b", completed: "#8b5cf6", cancelled: "#ef4444" };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Admin Dashboard</h2>
          <p className="text-muted text-sm">Platform monitoring and management</p>
        </div>
        <span className="badge badge-green">Admin: {user?.name}</span>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {TABS.map(t => (
          <button key={t.id}
            style={{ ...styles.tab, ...(tab === t.id ? styles.tabActive : {}) }}
            onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === "overview" && (
        <div className="fade-in">
          <div style={styles.statsGrid}>
            {[
              { label: "Total Trips",    value: stats.total,        icon: "🗂", color: "#0084ff" },
              { label: "Active Now",     value: stats.active,       icon: "🟢", color: "#00c896" },
              { label: "Completed",      value: stats.completed,    icon: "✅", color: "#8b5cf6" },
              { label: "Live Rides",     value: stats.live,         icon: "🔴", color: "#ff6b35" },
              { label: "Scheduled",      value: stats.scheduled,    icon: "📅", color: "#00c896" },
              { label: "Need Partner",   value: stats.need_partner, icon: "🤝", color: "#0084ff" },
            ].map(s => (
              <div key={s.label} style={{ ...styles.statCard, borderLeft: `3px solid ${s.color}` }}>
                <div style={{ fontSize: 24 }}>{s.icon}</div>
                <div style={{ fontSize: 28, fontFamily: "var(--font-display)", fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Trip type breakdown bar */}
          <div style={styles.breakdownCard}>
            <h3 style={styles.cardTitle}>Trip Type Breakdown</h3>
            <div style={styles.breakdownBar}>
              {[
                { type: "Live", val: stats.live, color: "#ff6b35" },
                { type: "Need Partner", val: stats.need_partner, color: "#0084ff" },
                { type: "Scheduled", val: stats.scheduled, color: "#00c896" },
              ].map(b => {
                const pct = stats.total ? ((b.val / stats.total) * 100).toFixed(1) : 0;
                return (
                  <div key={b.type} style={{ ...styles.breakdownSegment, flex: b.val || 0.01, background: b.color }} title={`${b.type}: ${b.val} (${pct}%)`} />
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 20, marginTop: 10 }}>
              {[
                { type: "Live", val: stats.live, color: "#ff6b35" },
                { type: "Need Partner", val: stats.need_partner, color: "#0084ff" },
                { type: "Scheduled", val: stats.scheduled, color: "#00c896" },
              ].map(b => (
                <div key={b.type} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: b.color }} />
                  <span style={{ color: "var(--text2)" }}>{b.type}</span>
                  <span style={{ fontWeight: 700, color: b.color }}>{b.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TRIPS ── */}
      {tab === "trips" && (
        <div className="fade-in">
          <div style={styles.tableCard}>
            <h3 style={styles.cardTitle}>All Trips ({trips.length})</h3>
            {loading ? (
              <div className="text-muted" style={{ padding: 20 }}>Loading…</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      {["Host","Route","Type","Seats","Fare","Departure","Status"].map(h => (
                        <th key={h} style={styles.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {trips.map(t => (
                      <tr key={t._id} style={styles.tr} onClick={() => navigate(`/trips/${t._id}`)}>
                        <td style={styles.td}>{t.host?.name || "—"}</td>
                        <td style={{ ...styles.td, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {t.origin?.address?.slice(0,20)} → {t.destination?.address?.slice(0,20)}
                        </td>
                        <td style={styles.td}>
                          <span style={{ color: TYPE_COLOR[t.tripType], fontWeight: 600, fontSize: 12 }}>
                            {t.tripType?.replace("_"," ").toUpperCase()}
                          </span>
                        </td>
                        <td style={styles.td}>{t.availableSeats}/{t.totalSeats}</td>
                        <td style={styles.td}>
                          {t.actualFare ? `₹${t.actualFare}` : t.predictedFare ? `₹${t.predictedFare.median}` : "—"}
                        </td>
                        <td style={{ ...styles.td, fontSize: 12 }}>{formatTime(t.departureTime)}</td>
                        <td style={styles.td}>
                          <span style={{ color: STATUS_COLOR[t.status] || "var(--text2)", fontWeight: 600, fontSize: 12 }}>
                            {t.status?.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SYSTEM ── */}
      {tab === "system" && (
        <div className="fade-in">
          <div style={styles.sysGrid}>
            {[
              { icon: "⚛️", label: "Frontend", status: "Running", port: "3000", color: "#61dafb" },
              { icon: "⚙️", label: "Backend API", status: "Running", port: "5000", color: "#68a063" },
              { icon: "🤖", label: "ML API", status: "Running", port: "5001", color: "#f59e0b" },
              { icon: "🗄️", label: "MongoDB", status: "Connected", port: "27017", color: "#13aa52" },
            ].map(s => (
              <div key={s.label} style={styles.sysCard}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16 }}>{s.label}</div>
                <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 10 }}>Port: {s.port}</div>
                <span className="badge badge-green" style={{ fontSize: 11 }}>● {s.status}</span>
              </div>
            ))}
          </div>

          <div style={styles.breakdownCard}>
            <h3 style={styles.cardTitle}>API Endpoints Reference</h3>
            {[
              ["POST", "/api/auth/register", "Register new user"],
              ["POST", "/api/auth/login",    "Login"],
              ["GET",  "/api/auth/me",       "Current user"],
              ["POST", "/api/trips",         "Create trip"],
              ["GET",  "/api/trips",         "List trips (city, type, gender)"],
              ["POST", "/api/trips/matches", "Find matching trips"],
              ["POST", "/api/trips/:id/join","Request to join"],
              ["GET",  "/api/chat/:tripId",  "Get messages"],
              ["POST", "/api/users/:id/rate","Rate a user"],
              ["POST", "/predict (ML)",      "Fare prediction"],
              ["POST", "/route-overlap (ML)","Route overlap score"],
            ].map(([method, path, desc]) => (
              <div key={path} style={styles.endpointRow}>
                <span style={{ ...styles.methodBadge, color: method === "GET" ? "#00c896" : method === "POST" ? "#0084ff" : "#ff6b35" }}>
                  {method}
                </span>
                <code style={styles.endpointPath}>{path}</code>
                <span style={{ fontSize: 13, color: "var(--text2)" }}>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { maxWidth: 1000, margin: "0 auto", padding: "24px 20px" },
  noAccess: { textAlign: "center", padding: "80px 20px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  title: { fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, marginBottom: 4 },
  tabs: { display: "flex", gap: 8, marginBottom: 24 },
  tab: { padding: "10px 20px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", color: "var(--text2)", fontSize: 14, fontFamily: "var(--font-body)", transition: "all 0.15s" },
  tabActive: { background: "var(--surface2)", color: "var(--text)", borderColor: "var(--accent)" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 },
  statCard: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 4 },
  breakdownCard: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 20, marginBottom: 16 },
  cardTitle: { fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, marginBottom: 16 },
  breakdownBar: { display: "flex", height: 16, borderRadius: 8, overflow: "hidden", gap: 2 },
  breakdownSegment: { height: "100%", transition: "flex 0.4s", minWidth: 4 },
  tableCard: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 20 },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "10px 12px", fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--border)" },
  td: { padding: "10px 12px", fontSize: 13, borderBottom: "1px solid var(--border)", color: "var(--text)" },
  tr: { cursor: "pointer", transition: "background 0.15s" },
  sysGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 },
  sysCard: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 20, textAlign: "center" },
  endpointRow: { display: "flex", alignItems: "center", gap: 14, padding: "8px 0", borderBottom: "1px solid var(--border)" },
  methodBadge: { fontFamily: "monospace", fontWeight: 700, fontSize: 12, minWidth: 40 },
  endpointPath: { background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 4, padding: "2px 8px", fontSize: 12, fontFamily: "monospace", color: "var(--accent2)", minWidth: 220 },
};
