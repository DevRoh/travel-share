import React, { useState } from "react";
import { predictFare, calcOverlap, getFareForecast } from "../utils/api";

export default function FarePredictor() {
  const [form, setForm] = useState({ city: "Kolkata", distance_km: "", duration_min: "", departure_hour: new Date().getHours(), day_of_week: new Date().getDay(), traffic_index: "1.2", passengers: "2" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forecast, setForecast] = useState([]);
  const [roForm, setRoForm] = useState({ lat1:"22.5726",lng1:"88.3639",lat1d:"22.6000",lng1d:"88.4500",lat2:"22.5800",lng2:"88.3700",lat2d:"22.5950",lng2d:"88.4400" });
  const [roResult, setRoResult] = useState(null);
  const [roLoading, setRoLoading] = useState(false);

  const hc  = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const hrc = (e) => setRoForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

  const handlePredict = async (e) => {
    e.preventDefault(); setLoading(true); setError(""); setResult(null); setForecast([]);
    try {
      const r = await predictFare({ city: form.city, distance_km: parseFloat(form.distance_km), duration_min: parseFloat(form.duration_min) || parseFloat(form.distance_km)*3, departure_hour: parseInt(form.departure_hour), day_of_week: parseInt(form.day_of_week), traffic_index: parseFloat(form.traffic_index), passengers: parseInt(form.passengers) });
      setResult(r.data);

      const forecastRes = await getFareForecast({
        city: form.city,
        distanceKm: parseFloat(form.distance_km),
        durationMin: parseFloat(form.duration_min) || parseFloat(form.distance_km)*3,
        dayOfWeek: parseInt(form.day_of_week)
      });
      if (forecastRes.data && forecastRes.data.forecast) {
        setForecast(forecastRes.data.forecast);
      }
    } catch (e) { setError("ML API not reachable. Make sure Flask server is running on port 5001."); }
    finally { setLoading(false); }
  };

  const handleOverlap = async (e) => {
    e.preventDefault(); setRoLoading(true);
    try {
      const r = await calcOverlap({
        origin1: { lat: parseFloat(roForm.lat1), lng: parseFloat(roForm.lng1) },
        dest1:   { lat: parseFloat(roForm.lat1d), lng: parseFloat(roForm.lng1d) },
        origin2: { lat: parseFloat(roForm.lat2), lng: parseFloat(roForm.lng2) },
        dest2:   { lat: parseFloat(roForm.lat2d), lng: parseFloat(roForm.lng2d) },
      });
      setRoResult(r.data);
    } catch (e) { console.error(e); }
    finally { setRoLoading(false); }
  };

  return (
    <div className="page-wrap">
      <h2 className="page-title">🤖 ML Tools Demo</h2>
      <p className="page-sub">Live demos of the ML fare prediction API and route overlap scoring algorithm.</p>

      <div className="fp-grid">
        {/* Fare Prediction */}
        <div className="fp-panel">
          <div className="fp-title">💰 Fare Prediction API</div>
          <p className="text-muted text-sm" style={{ marginBottom: 20 }}>Calls <code>POST /predict</code> on the Flask ML service (port 5001)</p>
          <form onSubmit={handlePredict}>
            <div className="form-row">
              <div className="form-group"><label>City</label>
                <select name="city" value={form.city} onChange={hc}>
                  {["Kolkata","Delhi","Mumbai","Bengaluru"].map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Distance (km)</label><input name="distance_km" type="number" step="0.1" placeholder="8.5" value={form.distance_km} onChange={hc} required /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Duration (min)</label><input name="duration_min" type="number" placeholder="25" value={form.duration_min} onChange={hc} /></div>
              <div className="form-group"><label>Hour (0–23)</label><input name="departure_hour" type="number" min="0" max="23" value={form.departure_hour} onChange={hc} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Day of Week</label>
                <select name="day_of_week" value={form.day_of_week} onChange={hc}>
                  {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Traffic Index</label>
                <select name="traffic_index" value={form.traffic_index} onChange={hc}>
                  <option value="0.8">0.8 Light</option><option value="1.0">1.0 Normal</option>
                  <option value="1.2">1.2 Moderate</option><option value="1.5">1.5 Heavy</option><option value="1.8">1.8 Very Heavy</option>
                </select>
              </div>
            </div>
            <div className="form-group"><label>Passengers</label>
              <select name="passengers" value={form.passengers} onChange={hc}>
                {[1,2,3,4].map((n) => <option key={n} value={n}>{n} passenger{n>1?"s":""}</option>)}
              </select>
            </div>
            {error && <div className="error-text" style={{ marginBottom: 12 }}>{error}</div>}
            <button type="submit" className="btn btn-primary w-full" style={{ padding: 12 }} disabled={loading}>
              {loading ? "Predicting…" : "🤖 Predict Fare"}
            </button>
          </form>
          {result && (
            <div className="result-box fade-in">
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Prediction Result</div>
              <div className="fare-range-row">
                <div className="fri"><div className="fri-lbl">Lower</div><div className="fri-val" style={{ color: "#00c896" }}>₹{result.lower_fare}</div></div>
                <div className="fri"><div className="fri-lbl">Median</div><div className="fri-val" style={{ color: "#0084ff" }}>₹{result.median_fare}</div></div>
                <div className="fri"><div className="fri-lbl">Upper</div><div className="fri-val" style={{ color: "#ff6b35" }}>₹{result.upper_fare}</div></div>
              </div>
              <div className="per-person-box">
                <span className="text-muted">Per Person ({result.passengers} passengers)</span>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, color: "var(--warning)" }}>₹{result.per_person_estimate}</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 8 }}>
                Model: {result.model_used} · City: {result.city} · {result.inputs?.distance_km}km · Hour: {result.inputs?.departure_hour}:00
              </div>
              
              {forecast && forecast.length > 0 && (
                <div style={{
                  marginTop: 18,
                  paddingTop: 14,
                  borderTop: "1px solid var(--border)"
                }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text2)", marginBottom: 12 }}>
                    📈 24-Hour Surge Timeline & Scheduler
                  </div>
                  
                  {(() => {
                    const fares = forecast.map(f => f.fare);
                    const minFare = Math.min(...fares);
                    const maxFare = Math.max(...fares);
                    const cheapest = forecast.find(f => f.fare === minFare);
                    const peak = forecast.find(f => f.fare === maxFare);

                    const pointsStr = forecast.map((f, i) => {
                      const x = (i / 23) * 500;
                      const y = 120 - ((f.fare - minFare) / (maxFare - minFare || 1)) * 80;
                      return `${x},${y}`;
                    }).join(" ");

                    const areaPoints = `0,140 ${pointsStr} 500,140`;

                    // Calculate next best time around selected hour
                    const selectedHour = parseInt(form.departure_hour) || 0;
                    const selectedForecast = forecast.find(f => f.hour === selectedHour);
                    
                    const startHour = Math.max(0, selectedHour - 3);
                    const endHour = Math.min(23, selectedHour + 3);
                    const windowForecast = forecast.filter(f => f.hour >= startHour && f.hour <= endHour);
                    const cheapestInWindow = windowForecast.length > 0 
                      ? windowForecast.reduce((min, item) => item.fare < min.fare ? item : min, windowForecast[0])
                      : null;

                    let alertBox = null;
                    if (cheapestInWindow && selectedForecast && cheapestInWindow.hour !== selectedHour && selectedForecast.fare > cheapestInWindow.fare) {
                      const savings = selectedForecast.fare - cheapestInWindow.fare;
                      alertBox = (
                        <div style={{ marginBottom: 10, background: "rgba(16, 185, 129, 0.06)", border: "1px solid rgba(16, 185, 129, 0.15)", padding: "6px 10px", borderRadius: 4, fontSize: 11, color: "#10b981" }}>
                          💡 <strong>Surge Optimizer:</strong> Shift departure to <strong>{cheapestInWindow.hour}:00</strong> to save <strong>₹{savings}</strong> compared to {selectedHour}:00.
                        </div>
                      );
                    } else {
                      alertBox = (
                        <div style={{ marginBottom: 10, background: "rgba(0, 132, 255, 0.06)", border: "1px solid rgba(0, 132, 255, 0.15)", padding: "6px 10px", borderRadius: 4, fontSize: 11, color: "#0084ff" }}>
                          💡 Your hour (<strong>{selectedHour}:00</strong>) is optimal for this time window.
                        </div>
                      );
                    }

                    return (
                      <>
                        {alertBox}

                        <div style={{ position: "relative", width: "100%" }}>
                          <svg viewBox="0 0 500 140" style={{ width: "100%", height: "120px", overflow: "visible" }}>
                            <defs>
                              <linearGradient id="predictorGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#0084ff" stopOpacity="0.25" />
                                <stop offset="100%" stopColor="#0084ff" stopOpacity="0.0" />
                              </linearGradient>
                            </defs>

                            <line x1="0" y1="120" x2="500" y2="120" stroke="var(--border)" strokeDasharray="3,3" />
                            <line x1="0" y1="80" x2="500" y2="80" stroke="var(--border)" strokeDasharray="3,3" />
                            <line x1="0" y1="40" x2="500" y2="40" stroke="var(--border)" strokeDasharray="3,3" />

                            <polygon points={areaPoints} fill="url(#predictorGrad)" />
                            <polyline points={pointsStr} fill="none" stroke="#0084ff" strokeWidth="2.5" />

                            {cheapest && (
                              <>
                                <circle cx={(cheapest.hour / 23) * 500} cy={120 - ((cheapest.fare - minFare) / (maxFare - minFare || 1)) * 80} r="4" fill="#00c896" />
                                <text x={(cheapest.hour / 23) * 500} y={120 - ((cheapest.fare - minFare) / (maxFare - minFare || 1)) * 80 - 8} textAnchor="middle" fill="#00c896" fontSize="9" fontWeight="bold">
                                  ₹{cheapest.fare}
                                </text>
                              </>
                            )}
                            {peak && peak.hour !== cheapest?.hour && (
                              <>
                                <circle cx={(peak.hour / 23) * 500} cy={120 - ((peak.fare - minFare) / (maxFare - minFare || 1)) * 80} r="4" fill="#ff6b35" />
                                <text x={(peak.hour / 23) * 500} y={120 - ((peak.fare - minFare) / (maxFare - minFare || 1)) * 80 - 8} textAnchor="middle" fill="#ff6b35" fontSize="9" fontWeight="bold">
                                  ₹{peak.fare}
                                </text>
                              </>
                            )}
                          </svg>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text3)", marginTop: 6 }}>
                            <span>00:00</span>
                            <span>04:00</span>
                            <span>08:00</span>
                            <span>12:00</span>
                            <span>16:00</span>
                            <span>20:00</span>
                            <span>23:00</span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Route Overlap */}
        <div className="fp-panel">
          <div className="fp-title">🎯 Route Overlap Scoring</div>
          <p className="text-muted text-sm" style={{ marginBottom: 20 }}>Calls <code>POST /route-overlap</code> — haversine + bearing match</p>
          <form onSubmit={handleOverlap}>
            {[["Trip 1 — Origin","lat1","lng1"],["Trip 1 — Destination","lat1d","lng1d"],["Trip 2 — Origin","lat2","lng2"],["Trip 2 — Destination","lat2d","lng2d"]].map(([lbl,la,ln]) => (
              <div key={lbl}>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>{lbl}</h4>
                <div className="form-row">
                  <div className="form-group"><label>Lat</label><input name={la} value={roForm[la]} onChange={hrc} /></div>
                  <div className="form-group"><label>Lng</label><input name={ln} value={roForm[ln]} onChange={hrc} /></div>
                </div>
              </div>
            ))}
            <button type="submit" className="btn btn-primary w-full" style={{ padding: 12 }} disabled={roLoading}>
              {roLoading ? "Calculating…" : "🎯 Calculate Overlap"}
            </button>
          </form>
          {roResult && (
            <div className="result-box fade-in">
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Overlap Result</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 12, color: "var(--text3)" }}>Overlap Score</div>
                  <div style={{ fontSize: 42, fontFamily: "var(--font-display)", fontWeight: 800, color: roResult.is_compatible ? "var(--accent)" : "var(--error)" }}>
                    {(roResult.overlap_score * 100).toFixed(1)}%
                  </div>
                  <span className={`badge ${roResult.is_compatible ? "badge-green" : "badge-orange"}`}>
                    {roResult.is_compatible ? "✅ Compatible" : "⚠️ Low Match"}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                  {[["Pickup Distance", `${roResult.pickup_distance_m}m`],["Dest Distance", `${roResult.dest_distance_m}m`],["Bearing Diff", `${roResult.bearing_diff_deg}°`]].map(([l,v]) => (
                    <div key={l} style={{ display: "flex", justifyContent: "space-between", gap: 24 }}>
                      <span className="text-muted">{l}</span><span style={{ fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 10 }}>Formula: 0.40×pickupScore + 0.30×destScore + 0.30×bearingScore</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
