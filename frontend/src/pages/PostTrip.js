import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createTrip, predictFare, getFareForecast } from "../utils/api";
import { useAuth } from "../utils/AuthContext";
import AddressSelectorMap from "../components/AddressSelectorMap";
import RouteMap from "../components/RouteMap";

const TYPES = [
  { id: "live",         icon: "🔴", label: "I'm riding now",        desc: "Already in a cab — find someone to split with" },
  { id: "need_partner", icon: "🔵", label: "Need a ride partner",   desc: "Not travelling yet — looking for someone going same way" },
  { id: "scheduled",    icon: "🟢", label: "Schedule a future trip",desc: "Plan ahead — ML will estimate your fare" },
];

export default function PostTrip() {
  const { user }      = useAuth();
  const navigate      = useNavigate();
  const [params]      = useSearchParams();
  const [step, setStep]         = useState(1);
  const [tripType, setTripType] = useState(params.get("type") || "live");
  const [form, setForm] = useState({
    originAddress: "", originLat: "", originLng: "",
    destAddress: "", destLat: "", destLng: "",
    departureTime: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
    totalSeats: "3", genderPreference: "Any",
    city: user?.city || "Kolkata", actualFare: "", distanceKm: "", durationMin: "",
    vehicleCompany: "Uber", vehicleModel: "", vehicleLicensePlate: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mlEstimate, setMlEstimate] = useState(null);
  const [mlLoading, setMlLoading] = useState(false);
  const [mlError, setMlError] = useState("");
  const [forecast, setForecast] = useState([]);
  const [forecastLoading, setForecastLoading] = useState(false);

  const hc = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  useEffect(() => {
    if (!form.originLat || !form.originLng || !form.destLat || !form.destLng) return;

    const getRouteDetails = async () => {
      try {
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${form.originLng},${form.originLat};${form.destLng},${form.destLat}?overview=false`);
        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const distance = (route.distance / 1000).toFixed(1); // meters to km
          
          // Traffic aware duration estimation
          const baseDuration = route.duration / 60; // seconds to minutes
          const dt = new Date(form.departureTime);
          const hour = dt.getHours();
          let trafficMultiplier = 1.2; // default regular city traffic
          
          if ((hour >= 8 && hour <= 11) || (hour >= 17 && hour <= 20)) {
            trafficMultiplier = 1.6; // peak rush hour traffic
          } else if (hour >= 22 || hour <= 6) {
            trafficMultiplier = 0.8; // empty night streets
          }
          
          const duration = Math.round(baseDuration * trafficMultiplier);

          setForm(f => ({
            ...f,
            distanceKm: distance,
            durationMin: duration,
          }));
        }
      } catch (e) {
        console.error("OSRM call failed during post trip setup:", e);
      }
    };
    getRouteDetails();
  }, [form.originLat, form.originLng, form.destLat, form.destLng, form.departureTime]);

  useEffect(() => {
    if (!form.distanceKm || !form.durationMin || !form.departureTime || !form.city) {
      setMlEstimate(null);
      return;
    }

    const fetchMLEstimate = async () => {
      setMlLoading(true);
      setMlError("");
      try {
        const dt = new Date(form.departureTime);
        const hour = dt.getHours();
        const dow = dt.getDay();
        
        let trafficIndex = 1.2;
        if ((hour >= 8 && hour <= 11) || (hour >= 17 && hour <= 20)) {
          trafficIndex = 1.6;
        } else if (hour >= 22 || hour <= 6) {
          trafficIndex = 0.8;
        }

        const res = await predictFare({
          city: form.city,
          distance_km: parseFloat(form.distanceKm),
          duration_min: parseFloat(form.durationMin),
          departure_hour: hour,
          day_of_week: dow,
          traffic_index: trafficIndex,
          passengers: parseInt(form.totalSeats) || 2,
        });

        if (res.data) {
          setMlEstimate(res.data);
        }

        setForecastLoading(true);
        try {
          const forecastRes = await getFareForecast({
            city: form.city,
            distanceKm: parseFloat(form.distanceKm),
            durationMin: parseFloat(form.durationMin),
            dayOfWeek: dow
          });
          if (forecastRes.data && forecastRes.data.forecast) {
            setForecast(forecastRes.data.forecast);
          }
        } catch (e) {
          console.error("Forecast fetch failed:", e);
        } finally {
          setForecastLoading(false);
        }
      } catch (err) {
        console.error("ML Prediction failed:", err);
        setMlError("Unable to fetch ML fare estimate. Run python api/app.py.");
      } finally {
        setMlLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchMLEstimate();
    }, 500);

    return () => clearTimeout(timer);
  }, [form.distanceKm, form.durationMin, form.departureTime, form.city, form.totalSeats]);

  useEffect(() => {
    if (step === 2 && tripType === "live" && !form.originLat) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await res.json();
            setForm(f => ({ ...f, originLat: lat.toFixed(6), originLng: lng.toFixed(6), originAddress: data.display_name || "Current Location" }));
          } catch (e) {
            setForm(f => ({ ...f, originLat: lat.toFixed(6), originLng: lng.toFixed(6), originAddress: "Current Location" }));
          }
        }, (err) => console.warn("Geolocation denied", err));
      }
    }
  }, [step, tripType]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const res = await createTrip({
        tripType,
        origin:      { lat: parseFloat(form.originLat) || 22.5726, lng: parseFloat(form.originLng) || 88.3639, address: form.originAddress },
        destination: { lat: parseFloat(form.destLat)   || 22.5514, lng: parseFloat(form.destLng)   || 88.3517, address: form.destAddress },
        departureTime: form.departureTime,
        totalSeats: parseInt(form.totalSeats), genderPreference: form.genderPreference, city: form.city,
        actualFare:  form.actualFare  ? parseFloat(form.actualFare)  : undefined,
        distanceKm:  form.distanceKm  ? parseFloat(form.distanceKm)  : undefined,
        durationMin: form.durationMin ? parseFloat(form.durationMin) : undefined,
        vehicle: {
          company: form.vehicleCompany,
          model: form.vehicleModel,
          licensePlate: form.vehicleLicensePlate,
        }
      });
      navigate(`/trips/${res.data.trip._id}`);
    } catch (e) { setError(e.response?.data?.error || "Failed to create trip"); }
    finally { setLoading(false); }
  };

  /* ── Step 1: choose type ── */
  if (step === 1) return (
    <div style={{ maxWidth: 620, margin: "0 auto", padding: "24px 20px" }}>
      <div className="post-container">
        <h3 className="page-title" style={{ fontSize: 22, marginBottom: 4 }}>Post a Trip</h3>
        <p className="text-muted text-sm" style={{ marginBottom: 24 }}>Choose your travel situation</p>
        <div className="type-grid">
          {TYPES.map((t) => (
            <div key={t.id} className={`type-card ${tripType === t.id ? "selected" : ""}`} onClick={() => setTripType(t.id)}>
              <span style={{ fontSize: 32 }}>{t.icon}</span>
              <div className="type-label">{t.label}</div>
              <div className="type-desc">{t.desc}</div>
            </div>
          ))}
        </div>
        <button className="btn btn-primary w-full" style={{ padding: 13 }} onClick={() => setStep(2)}>Continue →</button>
      </div>
    </div>
  );

  /* ── Step 2: form ── */
  const cfg = TYPES.find((t) => t.id === tripType);
  return (
    <div style={{ maxWidth: 620, margin: "0 auto", padding: "24px 20px" }}>
      <div className="post-container">
        <button style={{ background: "none", border: "none", color: "var(--text2)", cursor: "pointer", marginBottom: 16, fontSize: 14 }} onClick={() => setStep(1)}>← Back</button>
        <div className="type-indicator"><span style={{ fontSize: 18 }}>{cfg.icon}</span> {cfg.label}</div>

        {/* Abandoned Trip Penalty Warning Note */}
        <div style={{
          backgroundColor: "rgba(239, 68, 68, 0.08)",
          border: "1px solid rgba(239, 68, 68, 0.25)",
          borderRadius: "8px",
          padding: "12px 14px",
          marginBottom: "20px",
          fontSize: "13px",
          color: "var(--error, #ff4d4d)",
          lineHeight: "1.4"
        }}>
          ⚠️ <strong>Hosting Responsibility:</strong> Once you depart, you must mark your trip as <strong>Ongoing</strong>, and then <strong>Complete</strong> when finished. Abandoned ongoing trips (exceeding departure + duration + 2 hours) are auto-completed by the system, penalizing you with a <strong>1-star review rating</strong> and demoting your trips in search. Trips never started will be auto-deleted.
        </div>

        <form onSubmit={handleSubmit}>
          <div className="section-label">Origin</div>
          <AddressSelectorMap 
            label="Origin" 
            onLocationSelect={(loc) => setForm(f => ({ ...f, originLat: loc.lat, originLng: loc.lng, originAddress: loc.address }))} 
          />
          <div className="form-group"><label>Address / Landmark</label><input name="originAddress" placeholder="e.g. Salt Lake Sector V, Kolkata" value={form.originAddress} onChange={hc} required /></div>
          <div className="form-row">
            <div className="form-group"><label>Latitude (optional)</label><input name="originLat" type="number" step="any" placeholder="22.5726" value={form.originLat} onChange={hc} /></div>
            <div className="form-group"><label>Longitude (optional)</label><input name="originLng" type="number" step="any" placeholder="88.3639" value={form.originLng} onChange={hc} /></div>
          </div>

          <div className="section-label">Destination</div>
          <AddressSelectorMap 
            label="Destination" 
            onLocationSelect={(loc) => setForm(f => ({ ...f, destLat: loc.lat, destLng: loc.lng, destAddress: loc.address }))} 
          />
          <div className="form-group"><label>Address / Landmark</label><input name="destAddress" placeholder="e.g. Park Street, Kolkata" value={form.destAddress} onChange={hc} required /></div>
          <div className="form-row">
            <div className="form-group"><label>Latitude (optional)</label><input name="destLat" type="number" step="any" placeholder="22.5514" value={form.destLat} onChange={hc} /></div>
            <div className="form-group"><label>Longitude (optional)</label><input name="destLng" type="number" step="any" placeholder="88.3517" value={form.destLng} onChange={hc} /></div>
          </div>

          {form.originLat && form.originLng && form.destLat && form.destLng && (
            <div style={{ marginBottom: 20 }}>
              <div className="section-label">Route Preview</div>
              <RouteMap 
                origin={{ lat: parseFloat(form.originLat), lng: parseFloat(form.originLng) }}
                destination={{ lat: parseFloat(form.destLat), lng: parseFloat(form.destLng) }}
              />
            </div>
          )}

          <div className="section-label">Trip Details</div>
          <div className="form-row">
            <div className="form-group"><label>Departure Time</label><input type="datetime-local" name="departureTime" value={form.departureTime} onChange={hc} required /></div>
            <div className="form-group"><label>City</label>
              <select name="city" value={form.city} onChange={hc}>
                {["Kolkata","Delhi","Mumbai","Bengaluru"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Seats Available to Share (Seats Left)</label>
              <select name="totalSeats" value={form.totalSeats} onChange={hc}>
                {[1,2,3,4,5,6].map((n) => <option key={n} value={n}>{n} seat{n>1?"s":""}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Gender Preference</label>
              <select name="genderPreference" value={form.genderPreference} onChange={hc}>
                <option value="Any">Any</option><option value="Male">Male only</option><option value="Female">Female only</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Total Fare / Estimated Cost (₹)</label>
            <div style={{ display: "flex", gap: 10 }}>
              <input 
                type="number" 
                name="actualFare" 
                placeholder="e.g. 350" 
                value={form.actualFare} 
                onChange={hc} 
                required 
                style={{ flex: 1 }}
              />
              {mlEstimate && !mlLoading && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setForm((f) => ({ ...f, actualFare: mlEstimate.median_fare }))}
                  style={{ whiteSpace: "nowrap", padding: "0 16px" }}
                >
                  ⚡ Apply ML Estimate
                </button>
              )}
            </div>
            <span className="text-muted text-sm" style={{ marginTop: 4 }}>Total cost of the ride — will be split equally among all co-travelers.</span>

            {/* ML Estimate Card */}
            {(mlLoading || mlEstimate || mlError) && (
              <div 
                style={{
                  marginTop: 12,
                  padding: 14,
                  borderRadius: 8,
                  backgroundColor: "var(--bg-card, #232329)",
                  border: "1px solid var(--border, #32323b)",
                  fontSize: 13,
                  color: "var(--text1, #ffffff)",
                }}
              >
                {mlLoading && (
                  <div style={{ color: "var(--text3, #b3b3b3)", display: "flex", alignItems: "center", gap: 8 }}>
                    <span>⏳</span> Estimating fare with Machine Learning...
                  </div>
                )}
                {mlError && <div style={{ color: "var(--error, #ff4d4d)" }}>⚠️ {mlError}</div>}
                {mlEstimate && !mlLoading && (
                  <div>
                    <div style={{ fontWeight: 600, color: "var(--text1, #ffffff)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                      🤖 ML Fare Estimate Range
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", margin: "10px 0" }}>
                      <div>
                        <span className="text-muted" style={{ fontSize: 11 }}>Lower</span>
                        <div style={{ color: "#00c896", fontWeight: 700, fontSize: 16 }}>₹{mlEstimate.lower_fare}</div>
                      </div>
                      <div>
                        <span className="text-muted" style={{ fontSize: 11 }}>Median</span>
                        <div style={{ color: "#0084ff", fontWeight: 700, fontSize: 16 }}>₹{mlEstimate.median_fare}</div>
                      </div>
                      <div>
                        <span className="text-muted" style={{ fontSize: 11 }}>Upper</span>
                        <div style={{ color: "#ff6b35", fontWeight: 700, fontSize: 16 }}>₹{mlEstimate.upper_fare}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text3, #b3b3b3)", borderTop: "1px solid var(--border, #32323b)", paddingTop: 8, marginTop: 8 }}>
                      Model: <strong>{mlEstimate.model_used}</strong> · Distance: <strong>{mlEstimate.inputs?.distance_km} km</strong> · Duration: <strong>{mlEstimate.inputs?.duration_min} mins</strong>
                    </div>
                  </div>
                )}
              </div>
            )}

            {forecast && forecast.length > 0 && !mlLoading && (
              <div style={{
                marginTop: 16,
                padding: 14,
                borderRadius: 8,
                backgroundColor: "var(--bg-card, #232329)",
                border: "1px solid var(--border, #32323b)",
              }}>
                <div style={{ fontWeight: 600, color: "var(--text1, #ffffff)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  📈 24-Hour Fare Forecast (ML Surge Scheduler)
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
                  const dt = new Date(form.departureTime);
                  const selectedHour = dt.getHours();
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
                      <div style={{ marginBottom: 12, background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)", padding: "10px 12px", borderRadius: 6, fontSize: 12, color: "#10b981" }}>
                        💡 <strong>Surge Optimizer:</strong> Shift departure to <strong>{cheapestInWindow.hour}:00</strong> instead of {selectedHour}:00 to bypass peak surge and save <strong>₹{savings}</strong> on your total fare!
                      </div>
                    );
                  } else {
                    alertBox = (
                      <div style={{ marginBottom: 12, background: "rgba(0, 132, 255, 0.08)", border: "1px solid rgba(0, 132, 255, 0.2)", padding: "10px 12px", borderRadius: 6, fontSize: 12, color: "#0084ff" }}>
                        💡 <strong>Optimal Time:</strong> Your selected departure hour (<strong>{selectedHour}:00</strong>) is already the most cost-effective time to depart within a ±3 hour window!
                      </div>
                    );
                  }

                  return (
                    <>
                      {alertBox}

                      <div style={{ position: "relative", width: "100%" }}>
                        <svg viewBox="0 0 500 140" style={{ width: "100%", height: "130px", overflow: "visible" }}>
                          <defs>
                            <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          {/* Grid Lines */}
                          <line x1="0" y1="120" x2="500" y2="120" stroke="var(--border)" strokeDasharray="3,3" />
                          <line x1="0" y1="80" x2="500" y2="80" stroke="var(--border)" strokeDasharray="3,3" />
                          <line x1="0" y1="40" x2="500" y2="40" stroke="var(--border)" strokeDasharray="3,3" />

                          {/* Area Path */}
                          <polygon points={areaPoints} fill="url(#forecastGrad)" />

                          {/* Line Path */}
                          <polyline points={pointsStr} fill="none" stroke="#10b981" strokeWidth="2.5" />

                          {/* Dots */}
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
                                Peak: ₹{peak.fare}
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

          {/* Vehicle / Cab Details Section */}
          <div className="section-label">Vehicle / Cab Details</div>
          <div className="form-group">
            <label>Operator / Service Type</label>
            <select name="vehicleCompany" value={form.vehicleCompany} onChange={hc}>
              {["Uber", "Ola", "Yatri Sathi", "InDrive", "Personal Car", "Auto/E-rickshaw", "Other"].map((op) => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Vehicle Model (e.g. Swift, Auto)</label>
              <input 
                name="vehicleModel" 
                placeholder="e.g. Swift Dzire, Tata Nexon" 
                value={form.vehicleModel} 
                onChange={hc} 
                required 
              />
            </div>
            <div className="form-group">
              <label>License Plate / Cab ID</label>
              <input 
                name="vehicleLicensePlate" 
                placeholder="e.g. WB 02 AB 1234, Auto-42" 
                value={form.vehicleLicensePlate} 
                onChange={hc} 
                required 
              />
            </div>
          </div>

          {error && <div className="error-text" style={{ marginBottom: 12 }}>{error}</div>}
          <button type="submit" className="btn btn-primary w-full" style={{ padding: 13, fontSize: 15, marginTop: 8 }} disabled={loading}>
            {loading ? "Posting trip…" : "🚗 Post Trip"}
          </button>
        </form>
      </div>
    </div>
  );
}
