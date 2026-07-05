import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getTripById, joinTrip, managePassenger, getFareSplit, getMessages, sendMessage, updateTripStatus, getReviewStatus, submitReview, confirmPayment } from "../utils/api";
import { useAuth } from "../utils/AuthContext";
import { useSocket } from "../utils/SocketContext";
import RouteMap from "../components/RouteMap";

export default function TripDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { socket, connected } = useSocket();

  useEffect(() => {
    if (!socket) return;
    
    socket.emit("join_trip", id);
    
    const handleTripUpdate = (data) => {
      if (data?.trip?._id === id) {
        setTrip(data.trip);
      }
    };

    const handleNewMessage = (msg) => {
      if (msg?.trip === id) {
        setMsgs((prev) => {
          if (prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
      }
    };

    socket.on("trip_updated", handleTripUpdate);
    socket.on("new_message", handleNewMessage);

    return () => {
      socket.off("trip_updated", handleTripUpdate);
      socket.off("new_message", handleNewMessage);
    };
  }, [socket, id]);
  const navigate = useNavigate();
  const location = useLocation();
  const [trip, setTrip]       = useState(null);
  const [split, setSplit]     = useState(null);
  const [msgs, setMsgs]       = useState([]);
  const [msgText, setMsgText] = useState("");
  const [passengerLocation, setPassengerLocation] = useState(null);
  const [suggestedStopInfo, setSuggestedStopInfo] = useState(null);
  
  const [tab, setTab]         = useState("info");
  
  const [hasReviewed, setHasReviewed] = useState(false);
  const [ratingInput, setRatingInput] = useState(5);
  const [commentInput, setCommentInput] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [finalFareInput, setFinalFareInput] = useState("");

  useEffect(() => {
    if (trip && trip.status === "ongoing") {
      setFinalFareInput(trip.predictedFare?.median || "");
    }
  }, [trip]);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const urlTab = queryParams.get("tab");
    if (urlTab) setTab(urlTab);
  }, [location.search]);
  const [loading, setLoading] = useState(true);
  const [joinLoading, setJoinLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [error, setError]     = useState("");
  const chatEndRef = useRef(null);

  const isHost     = trip?.host?._id === user?._id;
  const myEntry    = trip?.passengers?.find((p) => p.user?._id === user?._id);
  const isAccepted = myEntry?.status === "accepted";
  const isPending  = myEntry?.status === "pending";
  const canChat    = isHost || isAccepted;

  useEffect(() => {
    setLoading(true);
    getTripById(id).then((r) => setTrip(r.data.trip)).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!trip) return;
    getFareSplit(id).then((r) => setSplit(r.data.split)).catch(() => {});
    if (canChat) getMessages(id).then((r) => setMsgs(r.data.messages)).catch(() => {});

    if (trip.status === "completed" && !isHost && isAccepted) {
      getReviewStatus(id)
        .then((r) => setHasReviewed(r.data.hasReviewed))
        .catch((err) => console.error("Error fetching review status:", err));
    }
  }, [trip, canChat, isHost, isAccepted, id]);

  useEffect(() => {
    if (trip && !isHost) {
      // 1. Prioritize search origin from localStorage
      const pickupStr = localStorage.getItem("ts_last_search_pickup");
      if (pickupStr) {
        try {
          const cachedPickup = JSON.parse(pickupStr);
          if (cachedPickup && cachedPickup.lat) {
            setPassengerLocation({
              lat: parseFloat(cachedPickup.lat),
              lng: parseFloat(cachedPickup.lng),
            });
            return;
          }
        } catch (e) {
          console.error("Failed to parse cached pickup", e);
        }
      }

      // 2. Check if already joined and has saved coordinates
      const myEntry = trip.passengers.find(
        (p) => (p.user?._id || p.user) === user?._id
      );
      if (myEntry && myEntry.pickup && myEntry.pickup.lat) {
        setPassengerLocation({
          lat: myEntry.pickup.lat,
          lng: myEntry.pickup.lng,
        });
      } else if (navigator.geolocation) {
        // 3. Fallback to physical geolocation
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setPassengerLocation({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            });
          },
          (err) => console.warn("Passenger geolocation failed:", err)
        );
      }
    }
  }, [trip, isHost, user]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const handleJoin = async () => {
    setJoinLoading(true); setError("");
    try {
      const pickupStr = localStorage.getItem("ts_last_search_pickup");
      const dropoffStr = localStorage.getItem("ts_last_search_dropoff");
      const pickup = pickupStr ? JSON.parse(pickupStr) : null;
      const dropoff = dropoffStr ? JSON.parse(dropoffStr) : null;

      const r = await joinTrip(id, { pickup, dropoff });
      setTrip(r.data.trip);
    } catch (e) {
      setError(e.response?.data?.error || "Could not join trip");
    } finally {
      setJoinLoading(false);
    }
  };

  const handleManage = async (userId, action) => {
    try { const r = await managePassenger(id, userId, action); setTrip(r.data.trip); }
    catch (e) { setError(e.response?.data?.error || "Action failed"); }
  };

  const handleStatusChange = async (newStatus, actualFare = null) => {
    setStatusLoading(true); setError("");
    if (newStatus === "completed" && actualFare) {
      const parsed = parseFloat(actualFare);
      if (isNaN(parsed) || parsed <= 0) {
        setError("Please enter a valid positive fare amount.");
        setStatusLoading(false);
        return;
      }
    }
    try {
      const data = (newStatus === "completed" && actualFare) ? { actualFare: parseFloat(actualFare) } : {};
      const r = await updateTripStatus(id, newStatus, data);
      setTrip(r.data.trip);
    } catch (e) {
      setError(e.response?.data?.error || "Could not update trip status");
    } finally {
      setStatusLoading(false);
    }
  };

  const handlePaymentConfirm = async () => {
    setStatusLoading(true); setError("");
    try {
      const r = await confirmPayment(id);
      setTrip(r.data.trip);
    } catch (e) {
      setError(e.response?.data?.error || "Could not confirm payment");
    } finally {
      setStatusLoading(false);
    }
  };

  const handleSend = async () => {
    if (!msgText.trim()) return;
    if (socket && connected) {
      socket.emit("send_message", { tripId: id, text: msgText });
      setMsgText("");
    } else {
      try {
        const r = await sendMessage(id, msgText);
        setMsgs((m) => {
          if (m.some((msg) => msg._id === r.data.message._id)) return m;
          return [...m, r.data.message];
        });
        setMsgText("");
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);
    setError("");
    try {
      await submitReview(id, { rating: ratingInput, comment: commentInput });
      setReviewSuccess(true);
      setHasReviewed(true);
      const r = await getTripById(id);
      setTrip(r.data.trip);
    } catch (e) {
      setError(e.response?.data?.error || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handlePanic = () => {
    const phone = user?.emergencyContact?.phone;
    const name = user?.emergencyContact?.name || "Emergency Contact";
    if (phone) {
      if (window.confirm(`🚨 PANIC MODE!\n\nThis will trigger an emergency call to your saved contact: ${name} (${phone}).\n\nClick OK to dial.`)) {
        window.location.href = `tel:${phone}`;
      }
    } else {
      alert("⚠️ No Emergency Contact Saved!\n\nPlease update your profile settings with an emergency contact phone number to use Panic Mode.");
    }
  };

  const fmt = (d) => new Date(d).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const TYPE_LABEL = { live: "🔴 Live", need_partner: "🔵 Needs Partner", scheduled: "🟢 Scheduled" };
  const TYPE_BADGE = { live: "badge-orange", need_partner: "badge-blue", scheduled: "badge-green" };
  const STATUS_LABEL = { active: "Active", full: "Full", ongoing: "Ongoing 🚗", completed: "Completed 🏁", cancelled: "Cancelled ❌" };
  const STATUS_BADGE = { active: "badge-green", full: "badge-blue", ongoing: "badge-orange", completed: "badge-gray", cancelled: "badge-gray" };

  if (loading) return <div style={{ textAlign: "center", padding: 60, color: "var(--text2)" }}>Loading trip…</div>;
  if (!trip)   return <div style={{ textAlign: "center", padding: 60, color: "var(--text2)" }}>Trip not found.</div>;

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 20px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <button className="td-back" onClick={() => navigate(-1)}>← Back</button>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {/* Panic Mode Button */}
          {(trip.status === "ongoing" || trip.status === "active" || trip.status === "full") && (
            <button
              onClick={handlePanic}
              style={{
                backgroundColor: "#ff4d4d",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: "700",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                boxShadow: "0 0 10px rgba(255, 77, 77, 0.4)",
              }}
            >
              🚨 Panic Mode
            </button>
          )}
          <span className={`badge ${TYPE_BADGE[trip.tripType] || "badge-green"}`}>{TYPE_LABEL[trip.tripType]}</span>
        </div>
      </div>

      {/* Host */}
      <div className="host-card">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="avatar" style={{ width: 52, height: 52, fontSize: 20 }}>{trip.host?.name?.[0]?.toUpperCase()}</div>
          <div>
            <div className="host-name">{trip.host?.name}</div>
            <div style={{ color: "var(--text2)", fontSize: 13 }}>
              <span className="stars">★</span> {trip.host?.rating?.toFixed(1)} · {trip.host?.gender}
            </div>
            {isAccepted && <div style={{ color: "var(--text2)", fontSize: 13 }}>📞 {trip.host?.phone}</div>}
          </div>
        </div>
        <div style={{ fontSize: 22, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--accent)" }}>
          {trip.availableSeats} seat{trip.availableSeats !== 1 ? "s" : ""} left
        </div>
      </div>

      {/* Route */}
      <div className="card" style={{ marginBottom: 14 }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, marginBottom: 14 }}>Route</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#00c896", flexShrink: 0, marginTop: 4 }} />
            <div><div style={{ fontSize: 13, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em" }}>From</div><div style={{ fontWeight: 600 }}>{trip.origin?.address || `${trip.origin?.lat}, ${trip.origin?.lng}`}</div></div>
          </div>
          <div style={{ width: 1, height: 16, background: "var(--border)", marginLeft: 5 }} />
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#0084ff", flexShrink: 0, marginTop: 4 }} />
            <div><div style={{ fontSize: 13, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em" }}>To</div><div style={{ fontWeight: 600 }}>{trip.destination?.address || `${trip.destination?.lat}, ${trip.destination?.lng}`}</div></div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {["info", "map", "passengers", "fare", ...(canChat ? ["chat"] : [])].map((t) => (
          <button key={t} className={`tab-btn ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t === "info" ? "ℹ️ Info" : t === "map" ? "🗺️ Map" : t === "passengers" ? "👥 Riders" : t === "fare" ? "💰 Fare" : "💬 Chat"}
          </button>
        ))}
      </div>

      {/* INFO */}
      {tab === "info" && (
        <div className="card fade-in">
          <div className="info-grid">
             <div><div className="info-lbl">Departure</div><div className="info-val">{fmt(trip.departureTime)}</div></div>
             <div><div className="info-lbl">City</div><div className="info-val">{trip.city}</div></div>
             <div><div className="info-lbl">Gender Pref.</div><div className="info-val">{trip.genderPreference}</div></div>
             <div>
               <div className="info-lbl">Status</div>
               <div className="info-val">
                 <span className={`badge ${STATUS_BADGE[trip.status] || "badge-gray"}`}>
                   {STATUS_LABEL[trip.status] || trip.status}
                 </span>
               </div>
             </div>
             {trip.distanceKm && <div><div className="info-lbl">Distance</div><div className="info-val">{trip.distanceKm} km</div></div>}
             {trip.durationMin && <div><div className="info-lbl">Duration</div><div className="info-val">~{trip.durationMin} min</div></div>}
           </div>

           {trip.vehicle && (trip.vehicle.model || trip.vehicle.licensePlate) && (
             <>
               <div className="divider" />
               <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "12px 14px", display: "flex", alignItems: "center", gap: "12px" }}>
                 <span style={{ fontSize: "24px" }}>🚗</span>
                 <div>
                   <div style={{ fontSize: "11px", color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em" }}>Vehicle / Cab Details</div>
                   <div style={{ fontWeight: "700", color: "var(--accent)" }}>
                     {trip.vehicle.company} {trip.vehicle.model ? `(${trip.vehicle.model})` : ""}
                   </div>
                   {trip.vehicle.licensePlate && (
                     <div style={{ fontSize: "13px", color: "var(--text2)", marginTop: "2px" }}>
                       Plate/ID: <code style={{ fontSize: "12px", background: "rgba(0,0,0,0.2)", borderColor: "var(--border)" }}>{trip.vehicle.licensePlate}</code>
                     </div>
                   )}
                 </div>
               </div>
             </>
           )}

           <div className="divider" />
           {error && <div className="error-text" style={{ marginBottom: 12 }}>{error}</div>}
           {!isHost && !myEntry && trip.status === "active" && (
             <button className="btn btn-primary w-full" style={{ padding: 12 }} onClick={handleJoin} disabled={joinLoading}>
               {joinLoading ? "Sending request…" : "🤝 Request to Join"}
             </button>
           )}
           {isPending  && trip.status === "active" && <div className="pending-banner">⏳ Your join request is pending host approval.</div>}
           {isAccepted && !isHost && trip.status !== "completed" && trip.status !== "cancelled" && (
             <div className="accepted-banner">✅ You're in! Use the Chat tab to coordinate.</div>
           )}
           {isHost && (
             <div style={{ marginTop: "16px" }}>
               <div className="accepted-banner" style={{ marginBottom: "14px" }}>🚗 You are the host of this trip.</div>
               
               {/* Host Lifecycle Controls */}
               {(trip.status === "active" || trip.status === "full") && (
                 <div style={{ display: "flex", gap: "10px" }}>
                   <button 
                     type="button"
                     className="btn btn-primary" 
                     style={{ flex: 2, padding: "12px" }}
                     onClick={() => handleStatusChange("ongoing")}
                     disabled={statusLoading}
                   >
                     {statusLoading ? "Starting..." : "🚗 Start Trip"}
                   </button>
                   <button 
                     type="button"
                     className="btn btn-secondary" 
                     style={{ flex: 1, padding: "12px", borderColor: "var(--error)", color: "var(--error)", border: "1px solid var(--error)", background: "transparent" }}
                     onClick={() => handleStatusChange("cancelled")}
                     disabled={statusLoading}
                   >
                     {statusLoading ? "Cancelling..." : "❌ Cancel"}
                   </button>
                 </div>
               )}
               
               {trip.status === "ongoing" && (
                 <>
                   <div style={{
                     backgroundColor: "rgba(245, 158, 11, 0.08)",
                     border: "1px solid rgba(245, 158, 11, 0.25)",
                     borderRadius: "8px",
                     padding: "10px 12px",
                     marginBottom: "16px",
                     fontSize: "13px",
                     color: "var(--warning, #ffaa00)",
                   }}>
                     🔔 <strong>Reminder:</strong> Tap the button below to complete the ride when you reach the destination. Forgetting to complete it within 2 hours of arrival will result in a <strong>1-star auto-penalty review</strong>.
                   </div>
                   <div className="form-group" style={{ marginBottom: "16px" }}>
                     <label htmlFor="finalFare" style={{ fontSize: "13px", fontWeight: "600", color: "var(--text2)", marginBottom: "6px" }}>
                       Final Ride Fare (₹)
                     </label>
                     <input 
                       id="finalFare"
                       type="number"
                       placeholder="e.g. 350"
                       value={finalFareInput}
                       onChange={(e) => setFinalFareInput(e.target.value)}
                       style={{
                         width: "100%",
                         padding: "12px",
                         borderRadius: "var(--radius-sm)",
                         backgroundColor: "var(--surface2)",
                         border: "1px solid var(--border)",
                         color: "var(--text)",
                         fontSize: "14px",
                         fontFamily: "inherit",
                         outline: "none",
                       }}
                     />
                     <small style={{ color: "var(--text3)", fontSize: "12px", marginTop: "4px", display: "block" }}>
                       We prefilled the ML predicted fare. Edit this to match the actual fare from your Uber/Ola/cab app to split costs accurately with your riders.
                     </small>
                   </div>
                   <button 
                     type="button"
                     className="btn" 
                     style={{ width: "100%", padding: "12px", background: "var(--accent)", color: "#0a0f1e", fontWeight: "700" }}
                     onClick={() => handleStatusChange("completed", finalFareInput)}
                     disabled={statusLoading}
                   >
                     {statusLoading ? "Completing..." : "🏁 Complete Trip & Split Fare"}
                   </button>
                 </>
               )}
             </div>
           )}

            {trip.status === "completed" && (isHost || isAccepted) && (
               <div style={{ marginTop: "16px" }}>
                 <div className="accepted-banner" style={{ background: "rgba(0, 200, 150, 0.1)", borderColor: "rgba(0, 200, 150, 0.3)", color: "var(--accent)" }}>
                   🏁 This trip was successfully completed! Please split the costs below.
                 </div>
                 
                 {split && (
                   <div style={{ marginTop: "14px" }}>
                     {!isHost && isAccepted && myEntry?.paymentStatus === "paid" ? (
                       <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px", textAlign: "center", marginBottom: "16px" }}>
                         <p style={{ fontSize: "16px", color: "var(--accent)", fontWeight: "700", marginBottom: "8px" }}>
                           Payment Confirmed ✅
                         </p>
                         <p className="text-muted text-sm">
                           You have paid your split of **₹{split.perPerson}** to **{trip.host.name}**.
                         </p>
                         <div style={{ marginTop: "14px", padding: "8px 16px", background: "rgba(0, 200, 150, 0.1)", borderRadius: "8px", border: "1px solid rgba(0, 200, 150, 0.2)", color: "var(--text)" }}>
                           💰 Savings added to your Dashboard: <strong>₹{split.total - split.perPerson}</strong>
                         </div>
                       </div>
                     ) : trip.host?.upiId ? (() => {
                       const upiLink = `upi://pay?pa=${encodeURIComponent(trip.host.upiId)}&pn=${encodeURIComponent(trip.host.name)}&am=${split.perPerson}&cu=INR&tn=${encodeURIComponent(`TravelShare Split - ${trip.destination.address.split(',')[0]}`)}`;
                       const qrCodeSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiLink)}`;
 
                       return (
                         <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px", textAlign: "center" }}>
                           <p className="text-muted text-sm" style={{ marginBottom: "14px" }}>
                             {isHost ? "Passengers can scan this QR code to pay their split directly to you:" : `Scan this QR code using any UPI app (GPay, PhonePe, Paytm) to pay your split of **₹${split.perPerson}** directly to **{trip.host.name}**:`}
                           </p>
                           
                           <div style={{ background: "white", padding: "12px", borderRadius: "12px", display: "inline-block", boxShadow: "0 4px 16px rgba(0,0,0,0.2)", marginBottom: "16px" }}>
                             <img 
                               src={qrCodeSrc} 
                               alt="UPI Payment QR Code" 
                               style={{ display: "block", width: "180px", height: "180px" }}
                             />
                           </div>
                           
                           <div style={{ fontSize: "12px", color: "var(--accent)" }}>
                             UPI ID: <code style={{ fontSize: "12px", background: "rgba(0,0,0,0.2)" }}>{trip.host.upiId}</code>
                           </div>
 
                           <div style={{ display: "flex", gap: "10px", width: "100%", marginTop: "16px" }}>
                             <a 
                               href={upiLink}
                               style={{ 
                                 flex: 1,
                                 display: "inline-block", 
                                 padding: "10px 20px", 
                                 borderRadius: "8px", 
                                 background: "var(--accent)", 
                                 color: "#0a0f1e", 
                                 fontWeight: "700", 
                                 textDecoration: "none", 
                                 fontSize: "14px" 
                               }}
                               className="btn"
                             >
                               📱 Open in UPI App
                             </a>
                             
                             {!isHost && isAccepted && (
                               <button
                                 type="button"
                                 className="btn btn-secondary"
                                 style={{ flex: 1, padding: "10px 20px", fontSize: "14px", fontWeight: "700" }}
                                 onClick={handlePaymentConfirm}
                                 disabled={statusLoading}
                               >
                                 {statusLoading ? "Processing..." : "💸 I've Paid My Split"}
                               </button>
                             )}
                           </div>
                         </div>
                       );
                     })() : (
                       <div style={{ background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.25)", borderRadius: "10px", padding: "14px", color: "var(--warning)", fontSize: "14px" }}>
                         {isHost ? (
                           <span>
                             ⚠️ **You haven't saved a UPI ID yet!** Go to your <a href="/profile" style={{ color: "var(--accent)", textDecoration: "underline", fontWeight: "600" }}>Profile Settings</a> to add one so co-travelers can pay you instantly.
                           </span>
                         ) : (
                           <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                             <span>
                               ⏳ **Host has not added a UPI ID yet.** Please coordinate splits manually or ask the host to update their Profile Settings to generate a QR code split!
                             </span>
                             <button
                               type="button"
                               className="btn btn-secondary w-full"
                               onClick={handlePaymentConfirm}
                               disabled={statusLoading}
                             >
                               {statusLoading ? "Processing..." : "💸 Confirm Cash/Manual Payment"}
                             </button>
                           </div>
                         )}
                       </div>
                     )}
 
                     {/* Host Payment Checklist */}
                     {isHost && (
                       <div style={{ marginTop: "20px", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px", textAlign: "left" }}>
                         <h4 style={{ fontFamily: "var(--font-display)", fontSize: "15px", fontWeight: "700", marginBottom: "12px" }}>
                           👥 Passenger Payment Tracker
                         </h4>
                         <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                           {trip.passengers.filter(p => p.status === "accepted").length === 0 ? (
                             <p className="text-muted text-sm">No passengers joined this trip.</p>
                           ) : (
                             trip.passengers.filter(p => p.status === "accepted").map(p => (
                               <div key={p.user?._id || p._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                                 <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                   <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{p.user?.name?.[0]?.toUpperCase()}</div>
                                   <span style={{ fontWeight: "600", fontSize: "13px" }}>{p.user?.name}</span>
                                 </div>
                                 <span className={`badge ${p.paymentStatus === "paid" ? "badge-green" : "badge-orange"}`} style={{ fontSize: "10px" }}>
                                   {p.paymentStatus === "paid" ? "Paid ✅" : "Unpaid ⏳"}
                                 </span>
                               </div>
                             ))
                           )}
                         </div>
                       </div>
                     )}

                    {/* Host Review Card (Passenger only) */}
                    {!isHost && isAccepted && (
                      <div style={{ marginTop: "20px", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
                        <h4 style={{ fontFamily: "var(--font-display)", fontSize: "16px", fontWeight: "700", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                          ⭐ Rate Your Host
                        </h4>
                        
                        {hasReviewed ? (
                          <div style={{ color: "#00c896", fontSize: "14px", fontWeight: "600", marginTop: "8px" }}>
                            ✅ Thank you! Your review for {trip.host?.name} has been submitted.
                          </div>
                        ) : (
                          <form onSubmit={handleReviewSubmit} style={{ marginTop: "12px" }}>
                            <p className="text-muted text-sm" style={{ marginBottom: "14px" }}>
                              How was your ride-sharing and coordination experience with **{trip.host?.name}**?
                            </p>
                            
                            {/* Interactive Star Selection */}
                            <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setRatingInput(star)}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    fontSize: "28px",
                                    padding: 0,
                                    color: star <= ratingInput ? "var(--warning, #ffaa00)" : "var(--border, #32323b)",
                                    transition: "color 0.2s ease",
                                  }}
                                >
                                  ★
                                </button>
                              ))}
                            </div>
                            
                            <div className="form-group" style={{ marginBottom: "16px" }}>
                              <label style={{ fontSize: "12px", color: "var(--text2)", marginBottom: "6px", display: "block" }}>Comments / Feedback</label>
                              <textarea
                                rows="3"
                                placeholder="Write about the ride, promptness, driving, coordination..."
                                value={commentInput}
                                onChange={(e) => setCommentInput(e.target.value)}
                                style={{
                                  width: "100%",
                                  padding: "10px",
                                  borderRadius: "8px",
                                  backgroundColor: "var(--bg-card, #232329)",
                                  border: "1px solid var(--border, #32323b)",
                                  color: "var(--text1, #ffffff)",
                                  fontSize: "13px",
                                  fontFamily: "inherit",
                                  resize: "vertical",
                                }}
                              />
                            </div>
                            
                            {error && <div className="error-text" style={{ marginBottom: "12px", fontSize: "13px" }}>{error}</div>}
                            
                            <button
                              type="submit"
                              className="btn btn-primary"
                              style={{ padding: "10px 20px", fontSize: "14px" }}
                              disabled={submittingReview}
                            >
                              {submittingReview ? "Submitting..." : "Submit Review"}
                            </button>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {trip.status === "completed" && !isHost && !isAccepted && (
              <div className="accepted-banner" style={{ background: "rgba(0, 200, 150, 0.1)", borderColor: "rgba(0, 200, 150, 0.3)", color: "var(--accent)", marginTop: "14px" }}>
                🏁 This trip has been successfully completed.
              </div>
            )}

           {trip.status === "cancelled" && (
             <div className="pending-banner" style={{ background: "rgba(239, 68, 68, 0.1)", borderColor: "rgba(239, 68, 68, 0.3)", color: "var(--error)", marginTop: "14px" }}>
               ❌ This trip has been cancelled.
             </div>
           )}
        </div>
      )}

      {/* MAP */}
      {tab === "map" && (
        <div className="card fade-in" style={{ padding: "16px" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, marginBottom: 14 }}>Live Route</h3>
          <RouteMap 
            origin={trip.origin} 
            destination={trip.destination} 
            passengerLocation={passengerLocation} 
            onStopCalculated={(stop) => setSuggestedStopInfo(stop)}
          />
          {suggestedStopInfo && (
            <div style={{
              marginTop: "16px",
              background: "rgba(255, 170, 0, 0.06)",
              border: "1px solid rgba(255, 170, 0, 0.15)",
              borderRadius: "10px",
              padding: "16px",
            }}>
              <h4 style={{ color: "var(--warning)", fontFamily: "var(--font-display)", fontSize: "14px", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                <span>📍</span> Suggested Meeting Stop Calculated
              </h4>
              <p style={{ fontSize: "13px", color: "var(--text2)", marginBottom: "12px", lineHeight: "1.4" }}>
                The host's route passes closest to you at the **Gold Marker**. Walk or travel to this stop to catch the ride.
              </p>
              <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "11px", color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".04em" }}>Distance to Stop</span>
                  <span style={{ fontSize: "18px", fontWeight: "800", color: "var(--text)" }}>
                    {suggestedStopInfo.distanceMeters >= 1000 
                      ? `${(suggestedStopInfo.distanceMeters / 1000).toFixed(2)} km` 
                      : `${Math.round(suggestedStopInfo.distanceMeters)} m`
                    }
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "11px", color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".04em" }}>Estimated Travel/Walk Time</span>
                  <span style={{ fontSize: "18px", fontWeight: "800", color: "var(--text)" }}>
                    {Math.round(suggestedStopInfo.durationSeconds / 60)} mins
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PASSENGERS */}
      {tab === "passengers" && (
        <div className="card fade-in">
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, marginBottom: 14 }}>Riders ({trip.passengers?.length || 0})</h3>
          {trip.passengers?.length === 0 && <p className="text-muted text-sm">No join requests yet.</p>}
          {trip.passengers?.map((p) => (
            <div key={p.user?._id || p._id} className="pax-row">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="avatar" style={{ width: 36, height: 36, fontSize: 14 }}>{p.user?.name?.[0]?.toUpperCase()}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{p.user?.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text2)" }}>{p.user?.gender} · ★ {p.user?.rating?.toFixed(1)}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className={`badge ${p.status === "accepted" ? "badge-green" : p.status === "rejected" ? "badge-gray" : "badge-orange"}`}>{p.status}</span>
                {isHost && p.status === "pending" && (
                  <>
                    <button className="btn btn-primary btn-sm" onClick={() => handleManage(p.user?._id, "accept")}>Accept</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleManage(p.user?._id, "reject")}>Reject</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

           {/* FARE */}
      {tab === "fare" && (
        <div className="card fade-in">
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, marginBottom: 14 }}>Cost Breakdown</h3>
          {trip.actualFare && <div className="fare-row"><span className="text-muted">Actual Fare</span><span className="fare-big">₹{trip.actualFare}</span></div>}
          {trip.predictedFare && !trip.actualFare && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 12, background: trip.predictedFare.modelUsed === "gradient_boosting" ? "rgba(0,200,150,.12)" : "rgba(255,165,0,.12)", color: trip.predictedFare.modelUsed === "gradient_boosting" ? "var(--accent)" : "var(--warning)", borderRadius: 20, padding: "2px 10px", fontWeight: 700 }}>
                  {trip.predictedFare.modelUsed === "gradient_boosting" ? "🤖 ML Prediction" : "📐 Rule-based Estimate"}
                </span>
              </div>
              <div className="fare-row">
                <span className="text-muted">Fare Range</span>
                <span style={{ fontSize: 13, color: "var(--text2)" }}>₹{trip.predictedFare.lower} – ₹{trip.predictedFare.upper}</span>
              </div>
              <div className="fare-row"><span className="text-muted">Estimated Total</span><span className="fare-big" style={{ color: "#0084ff" }}>₹{trip.predictedFare.median}</span></div>
            </>
          )}
          {!trip.actualFare && !trip.predictedFare && <p className="text-muted text-sm">No fare information available yet.</p>}
          {split && <>
            <div className="divider" />
            <div className="fare-row"><span className="text-muted">Total Riders</span><span className="fare-big">{split.passengers}</span></div>
            
            {split.isProportional ? (
              <>
                <div style={{ background: "rgba(0,200,150,.08)", border: "1px solid rgba(0,200,150,.2)", borderRadius: 8, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 700 }}>{isHost ? "Host Share (Remaining)" : "Your Fair Share"}</span>
                    <span style={{ fontSize: 28, fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--accent)" }}>₹{split.perPerson}</span>
                  </div>
                  {!isHost && split.passengerDistanceKm > 0 && (
                    <div style={{ fontSize: 11, color: "var(--text2)", borderTop: "1px dashed rgba(0,200,150,.2)", paddingTop: 4 }}>
                      Calculated on your ride of <strong>{split.passengerDistanceKm.toFixed(1)} km</strong> vs total trip of {split.totalDistanceKm.toFixed(1)} km (shared 50% split).
                    </div>
                  )}
                  {isHost && (
                    <div style={{ fontSize: 11, color: "var(--text2)", borderTop: "1px dashed rgba(0,200,150,.2)", paddingTop: 4 }}>
                      Based on unitary km splitting for passengers (50% share discount).
                    </div>
                  )}
                </div>

                {isHost && split.breakdown && split.breakdown.length > 0 && (
                  <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 700 }}>Passenger Split Breakdown</div>
                    {split.breakdown.map((b) => (
                      <div key={b.userId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, background: "var(--surface2)", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)" }}>
                        <span style={{ color: "var(--text)" }}>{b.name} ({b.distanceKm.toFixed(1)} km)</span>
                        <span style={{ fontWeight: 700, color: "var(--warning)" }}>₹{b.sharedCost}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div style={{ background: "rgba(0,200,150,.08)", border: "1px solid rgba(0,200,150,.2)", borderRadius: 8, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                <span style={{ fontWeight: 700 }}>Per Person</span>
                <span style={{ fontSize: 28, fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--accent)" }}>₹{split.perPerson}</span>
              </div>
            )}
          </>}

          {/* UPI QR Split Payment Section */}
          {split && trip.status === "completed" && (
            <div style={{ marginTop: "24px" }}>
              <div className="divider" />
              <h4 style={{ fontFamily: "var(--font-display)", fontSize: "15px", fontWeight: "700", marginBottom: "14px" }}>
                💸 Instant UPI Split Payment
              </h4>

              {!isHost && isAccepted && myEntry?.paymentStatus === "paid" ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px", textAlign: "center" }}>
                  <p style={{ fontSize: "16px", color: "var(--accent)", fontWeight: "700", marginBottom: "8px" }}>
                    Payment Confirmed ✅
                  </p>
                  <p className="text-muted text-sm">
                    You have paid your split of **₹{split.perPerson}** to **{trip.host.name}**.
                  </p>
                  <div style={{ marginTop: "14px", padding: "8px 16px", background: "rgba(0, 200, 150, 0.1)", borderRadius: "8px", border: "1px solid rgba(0, 200, 150, 0.2)", color: "var(--text)" }}>
                    💰 Savings added to your Dashboard: <strong>₹{split.total - split.perPerson}</strong>
                  </div>
                </div>
              ) : trip.host?.upiId ? (() => {
                const upiLink = `upi://pay?pa=${encodeURIComponent(trip.host.upiId)}&pn=${encodeURIComponent(trip.host.name)}&am=${split.perPerson}&cu=INR&tn=${encodeURIComponent(`TravelShare Split - ${trip.destination.address.split(',')[0]}`)}`;
                const qrCodeSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiLink)}`;

                return (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px", textAlign: "center" }}>
                    <p className="text-muted text-sm" style={{ marginBottom: "14px" }}>
                      Scan this QR code using any UPI app (GPay, PhonePe, Paytm, BHIM) to pay **₹{split.perPerson}** directly to **{trip.host.name}**.
                    </p>
                    
                    <div style={{ background: "white", padding: "12px", borderRadius: "12px", display: "inline-block", boxShadow: "0 4px 16px rgba(0,0,0,0.2)", marginBottom: "16px" }}>
                      <img 
                        src={qrCodeSrc} 
                        alt="UPI Payment QR Code" 
                        style={{ display: "block", width: "180px", height: "180px" }}
                      />
                    </div>
                    
                    <div style={{ fontSize: "12px", color: "var(--accent)" }}>
                      UPI ID: <code style={{ fontSize: "12px", background: "rgba(0,0,0,0.2)" }}>{trip.host.upiId}</code>
                    </div>

                    <div style={{ display: "flex", gap: "10px", width: "100%", marginTop: "16px" }}>
                      <a 
                        href={upiLink}
                        style={{ 
                          flex: 1,
                          display: "inline-block", 
                          padding: "10px 20px", 
                          borderRadius: "8px", 
                          background: "var(--accent)", 
                          color: "#0a0f1e", 
                          fontWeight: "700", 
                          textDecoration: "none", 
                          fontSize: "14px" 
                        }}
                        className="btn"
                      >
                        📱 Open in UPI App
                      </a>
                      
                      {!isHost && isAccepted && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ flex: 1, padding: "10px 20px", fontSize: "14px", fontWeight: "700" }}
                          onClick={handlePaymentConfirm}
                          disabled={statusLoading}
                        >
                          {statusLoading ? "Processing..." : "💸 I've Paid My Split"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })() : (
                <div style={{ background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.25)", borderRadius: "10px", padding: "14px", color: "var(--warning)", fontSize: "14px" }}>
                  {isHost ? (
                    <span>
                      ⚠️ **You haven't saved a UPI ID yet!** Go to your <a href="/profile" style={{ color: "var(--accent)", textDecoration: "underline", fontWeight: "600" }}>Profile Settings</a> to add one so co-travelers can split the fare with you instantly.
                    </span>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      <span>
                        ⏳ **Host has not added a UPI ID yet.** Please coordinate splits manually or ask the host to update their Profile Settings to generate a QR code split!
                      </span>
                      <button
                        type="button"
                        className="btn btn-secondary w-full"
                        onClick={handlePaymentConfirm}
                        disabled={statusLoading}
                      >
                        {statusLoading ? "Processing..." : "💸 Confirm Cash/Manual Payment"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* CHAT */}
      {tab === "chat" && canChat && (
        <div className="card fade-in" style={{ display: "flex", flexDirection: "column" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Group Chat</h3>
          <div className="chat-msgs">
            {msgs.length === 0 && <p className="text-muted text-sm" style={{ margin: "auto" }}>No messages yet. Say hi! 👋</p>}
            {msgs.map((m) => {
              const mine = m.sender?._id === user?._id;
              return (
                <div key={m._id} className="msg-row" style={{ justifyContent: mine ? "flex-end" : "flex-start" }}>
                  {!mine && <div className="avatar" style={{ width: 28, height: 28, fontSize: 11, flexShrink: 0 }}>{m.sender?.name?.[0]}</div>}
                  <div className={`bubble ${mine ? "bubble-mine" : "bubble-theirs"}`}>
                    {!mine && <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 3 }}>{m.sender?.name}</div>}
                    {m.text}
                    <div style={{ fontSize: 10, opacity: .6, marginTop: 3, textAlign: mine ? "right" : "left" }}>
                      {new Date(m.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>
          <div className="chat-inp-row">
            <input value={msgText} onChange={(e) => setMsgText(e.target.value)} placeholder="Type a message…"
              onKeyDown={(e) => e.key === "Enter" && handleSend()} style={{ flex: 1 }} />
            <button className="btn btn-primary btn-sm" onClick={handleSend}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}
