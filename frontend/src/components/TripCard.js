import React from "react";
import { useNavigate } from "react-router-dom";

const TYPE_CONFIG = {
  live:         { label: "Live Now",       badgeClass: "badge-orange", icon: "🔴" },
  need_partner: { label: "Needs Partner",  badgeClass: "badge-blue",   icon: "🔵" },
  scheduled:    { label: "Scheduled",      badgeClass: "badge-green",  icon: "🟢" },
};

export default function TripCard({ trip, matchScore, showJoin = true }) {
  const navigate = useNavigate();
  const cfg = TYPE_CONFIG[trip.tripType] || TYPE_CONFIG.scheduled;
  const seatsLeft = trip.availableSeats;
  const fare = trip.actualFare || trip.predictedFare?.median;

  let badgeEl = <span className={`badge ${cfg.badgeClass}`}>{cfg.icon} {cfg.label}</span>;
  if (trip.status === "completed") {
    badgeEl = <span className="badge badge-gray">🏁 Completed</span>;
  } else if (trip.status === "cancelled") {
    badgeEl = <span className="badge badge-gray" style={{ borderColor: "var(--error)", color: "var(--error)" }}>❌ Cancelled</span>;
  } else if (trip.status === "ongoing") {
    badgeEl = <span className="badge badge-orange">🚗 Ongoing</span>;
  }

  const fmt = (d) => new Date(d).toLocaleString("en-IN", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="trip-card fade-in" onClick={() => navigate(`/trips/${trip._id}`)}>
      {/* Header */}
      <div className="tc-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="avatar">{trip.host?.name?.[0]?.toUpperCase()}</div>
          <div>
            <div className="tc-host-name">{trip.host?.name}</div>
            <div className="tc-host-meta">
              <span className="stars">{"★".repeat(Math.round(trip.host?.rating || 5))}</span>
              <span style={{ color: "var(--text2)", fontSize: 12 }}> {trip.host?.rating?.toFixed(1)}</span>
              <span style={{ color: "var(--text3)", marginLeft: 8, fontSize: 12 }}>{trip.host?.gender}</span>
            </div>
          </div>
        </div>
        {badgeEl}
      </div>

      <div className="divider" />

      {/* Route */}
      <div className="tc-route">
        <div className="tc-rpt">
          <span className="tc-dot" style={{ background: "#00c896" }} />
          <span className="tc-rtext">{trip.origin?.address || `${trip.origin?.lat?.toFixed(4)}, ${trip.origin?.lng?.toFixed(4)}`}</span>
        </div>
        <div className="tc-rline" />
        <div className="tc-rpt">
          <span className="tc-dot" style={{ background: "#0084ff" }} />
          <span className="tc-rtext">{trip.destination?.address || `${trip.destination?.lat?.toFixed(4)}, ${trip.destination?.lng?.toFixed(4)}`}</span>
        </div>
      </div>

      <div className="divider" />

      {/* Meta */}
      <div className="tc-meta">
        <span className="chip">🕐 {fmt(trip.departureTime)}</span>
        <span className="chip">💺 {seatsLeft} seat{seatsLeft !== 1 ? "s" : ""} left</span>
        {trip.city && <span className="chip">📍 {trip.city}</span>}
        {trip.genderPreference !== "Any" && <span className="chip">👤 {trip.genderPreference} only</span>}
      </div>

      {/* Footer */}
      <div className="tc-footer">
        <div>
          {trip.actualFare ? (
            <div className="fare-block">
              <span className="fare-lbl">Final Fare</span>
              <span className="fare-val" style={{ color: "var(--accent)" }}>₹{trip.actualFare}</span>
            </div>
          ) : fare ? (
            <div className="fare-block">
              {trip.predictedFare ? (
                <>
                  <span className="fare-lbl">Est. Fare</span>
                  <span className="fare-val">₹{trip.predictedFare.lower}–₹{trip.predictedFare.upper}</span>
                </>
              ) : (
                <>
                  <span className="fare-lbl">Fare</span>
                  <span className="fare-val">₹{fare}</span>
                </>
              )}
            </div>
          ) : (
            <span style={{ color: "var(--text3)", fontSize: 13 }}>Fare TBD</span>
          )}
        </div>

        {matchScore !== undefined && (
          <div className="match-blk">
            <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 4 }}>Match {Math.round(matchScore * 100)}%</div>
            <div className="score-bar" style={{ width: 80 }}>
              <div className="score-bar-fill" style={{ width: `${matchScore * 100}%` }} />
            </div>
          </div>
        )}

        {showJoin && (
          <button
            className="btn btn-primary btn-sm"
            onClick={(e) => { e.stopPropagation(); navigate(`/trips/${trip._id}`); }}
          >
            View →
          </button>
        )}
      </div>
    </div>
  );
}
