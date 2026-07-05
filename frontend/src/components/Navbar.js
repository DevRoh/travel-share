import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../utils/AuthContext";
import { getNotifications, markNotificationRead, managePassenger } from "../utils/api";

const NAV_LINKS = [
  { to: "/dashboard",       label: "Dashboard" },
  { to: "/trips",           label: "Browse Trips" },
  { to: "/post-trip",       label: "Post a Trip" },
  { to: "/my-trips",        label: "My Trips" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("trips"); // 'trips' or 'chats'
  
  const [notifications, setNotifications] = useState([]);
  const [myLocation, setMyLocation] = useState("Fetching location...");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!user) return;
    
    // 1. Fetch Global Location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&zoom=10`);
          const data = await res.json();
          setMyLocation(data.address?.city || data.address?.town || data.address?.county || "Current Location");
        } catch (e) {
          setMyLocation("Location Found");
        }
      }, () => setMyLocation("Location Disabled"));
    } else {
      setMyLocation("Location Unavailable");
    }

    // 2. Fetch Notifications
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // Check every 15s
    return () => clearInterval(interval);
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const res = await getNotifications();
      setNotifications(res.data.notifications || []);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  const handleManage = async (notif, action) => {
    try {
      await managePassenger(notif.relatedTrip._id, notif.sender._id, action);
      await markNotificationRead(notif._id);
      fetchNotifications();
      alert("Passenger " + action + "ed successfully!");
    } catch (err) {
      alert("Failed to " + action + " passenger");
    }
  };
  
  const handleRead = async (notif) => {
    if (!notif.isRead) {
      await markNotificationRead(notif._id);
      fetchNotifications();
    }
    setNotifOpen(false);
    if (notif.relatedTrip) {
      const targetTab = notif.type === "chat" ? "?tab=chat" : "";
      navigate(`/trips/${notif.relatedTrip._id}${targetTab}`);
    }
  };

  if (!user) return null;

  const isActive = (path) => {
    if (path === "/dashboard") {
      return location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(path);
  };
  const handleLogout = () => { logout(); navigate("/login"); };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const chatNotifs = notifications.filter(n => n.type === "chat");
  const tripNotifs = notifications.filter(n => n.type !== "chat");
  const displayNotifs = activeTab === "chats" ? chatNotifs : tripNotifs;

  return (
    <nav style={S.nav}>
      <div style={S.inner}>
        {/* Brand */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <Link to="/dashboard" style={S.brand}>
            <span style={{ fontSize: 22 }}>🚗</span>
            <span style={S.brandText}>TravelShare</span>
          </Link>
          <div style={{ fontSize: 11, color: "var(--text3)", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
            <span style={{ color: "var(--accent)" }}>📍</span> {myLocation}
          </div>
        </div>

        {/* Desktop links */}
        {!isMobile && (
          <div style={S.links}>
            {NAV_LINKS.map((l) => (
              <Link 
                key={l.to} 
                to={l.to} 
                className={`nav-link ${isActive(l.to) ? "active" : ""}`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        )}

        {/* Right */}
        <div style={S.right}>
          
          {/* Notification Bell */}
          <div style={{ position: "relative", marginRight: "8px" }}>
            <button 
              onClick={() => setNotifOpen(!notifOpen)}
              style={{
                background: "none", border: "none", fontSize: "20px", cursor: "pointer",
                padding: "6px", position: "relative"
              }}
            >
              🔔
              {unreadCount > 0 && (
                <span style={{
                  position: "absolute", top: 2, right: 2, background: "var(--error)", color: "white",
                  fontSize: "10px", fontWeight: "bold", padding: "2px 5px", borderRadius: "10px",
                  lineHeight: 1
                }}>
                  {unreadCount}
                </span>
              )}
            </button>
            
            {notifOpen && (
              <div style={{
                position: "absolute", top: "100%", right: 0, width: "340px", background: "var(--surface)",
                border: "1px solid var(--border)", borderRadius: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                marginTop: "8px", zIndex: 200, padding: "12px", maxHeight: "450px", display: "flex", flexDirection: "column"
              }}>
                {/* Tabs */}
                <div style={{ display: "flex", gap: "10px", marginBottom: "12px", borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
                  <button 
                    onClick={() => setActiveTab("trips")}
                    style={{ 
                      flex: 1, padding: "6px", border: "none", background: "transparent", cursor: "pointer",
                      fontSize: "14px", fontWeight: activeTab === "trips" ? "bold" : "normal",
                      color: activeTab === "trips" ? "#00c896" : "#888",
                      borderBottom: activeTab === "trips" ? "2px solid #00c896" : "2px solid transparent",
                      outline: "none"
                    }}
                  >
                    Trips
                  </button>
                  <button 
                    onClick={() => setActiveTab("chats")}
                    style={{ 
                      flex: 1, padding: "6px", border: "none", background: "transparent", cursor: "pointer",
                      fontSize: "14px", fontWeight: activeTab === "chats" ? "bold" : "normal",
                      color: activeTab === "chats" ? "#00c896" : "#888",
                      borderBottom: activeTab === "chats" ? "2px solid #00c896" : "2px solid transparent",
                      outline: "none"
                    }}
                  >
                    Chats
                  </button>
                </div>

                {/* List */}
                <div style={{ overflowY: "auto", flex: 1 }}>
                  {displayNotifs.length === 0 ? (
                    <p style={{ fontSize: "13px", color: "var(--text2)", textAlign: "center", margin: "20px 0" }}>No notifications.</p>
                  ) : (
                    displayNotifs.map((notif) => (
                      <div key={notif._id} style={{ 
                        padding: "10px", background: notif.isRead ? "transparent" : "var(--bg)", 
                        borderRadius: "8px", marginBottom: "8px",
                        border: "1px solid var(--border)", cursor: notif.type !== "trip_request" ? "pointer" : "default"
                      }} onClick={() => { if (notif.type !== "trip_request") handleRead(notif); }}>
                        <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: notif.type === "trip_request" && !notif.isRead ? "8px" : "0" }}>
                          <div className="avatar" style={{ width: 32, height: 32, fontSize: "12px", flexShrink: 0, background: "var(--surface2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {notif.sender?.name?.[0]?.toUpperCase() || "ℹ️"}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "12px", color: notif.isRead ? "var(--text2)" : "var(--text)", lineHeight: 1.4 }}>
                              {notif.content}
                            </div>
                            <div style={{ fontSize: "10px", color: "var(--text3)", marginTop: 2 }}>
                              {new Date(notif.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                          </div>
                          {!notif.isRead && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }}></div>}
                        </div>
                        
                        {/* Actions for pending trip requests */}
                        {notif.type === "trip_request" && !notif.isRead && (
                          <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                            <button className="btn btn-primary btn-sm" style={{ flex: 1, padding: "6px 0", fontSize: "12px" }} onClick={(e) => { e.stopPropagation(); handleManage(notif, "accept"); }}>Accept</button>
                            <button className="btn btn-secondary btn-sm" style={{ flex: 1, padding: "6px 0", fontSize: "12px" }} onClick={(e) => { e.stopPropagation(); handleManage(notif, "reject"); }}>Reject</button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <Link to="/profile" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "inherit" }}>
            <span 
              style={{ 
                fontSize: "12px", 
                fontWeight: "700", 
                color: "var(--warning, #ffaa00)", 
                backgroundColor: "rgba(255, 170, 0, 0.08)", 
                padding: "3px 8px", 
                borderRadius: "6px",
                border: "1px solid rgba(255, 170, 0, 0.2)",
                display: "flex",
                alignItems: "center",
                gap: "2px",
                whiteSpace: "nowrap"
              }}
              title="Your rating as host/passenger"
            >
              ★ {user.rating?.toFixed(1) || "5.0"}
            </span>
            <div className="avatar" style={{ width: 36, height: 36, fontSize: 14 }}>
              {user.name?.[0]?.toUpperCase()}
            </div>
          </Link>
          {!isMobile && <button className="btn btn-ghost" onClick={handleLogout}>Logout</button>}
          <button style={{ ...S.ham, display: isMobile ? "block" : "none" }} onClick={() => setOpen(!open)}>{open ? "✕" : "☰"}</button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div style={S.mobileMenu}>
          {NAV_LINKS.map((l) => (
            <Link key={l.to} to={l.to} style={S.mobileLink} onClick={() => setOpen(false)}>{l.label}</Link>
          ))}
          <button onClick={handleLogout} style={{ ...S.mobileLink, background: "none", border: "none", color: "var(--error)", cursor: "pointer", textAlign: "left" }}>Logout</button>
        </div>
      )}
    </nav>
  );
}

const S = {
  nav: { position: "sticky", top: 0, zIndex: 100, background: "rgba(10,15,30,.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)" },
  inner: { maxWidth: 1100, margin: "0 auto", padding: "0 20px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" },
  brand: { display: "flex", alignItems: "center", gap: 10, textDecoration: "none" },
  brandText: { fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, background: "linear-gradient(90deg,#00c896,#0084ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  links: { display: "flex", gap: 4 },
  link: { padding: "6px 14px", borderRadius: 8, fontSize: 14, color: "var(--text2)", textDecoration: "none", transition: "all .15s", fontWeight: 500 },
  linkActive: { background: "var(--surface2)", color: "var(--text)" },
  right: { display: "flex", alignItems: "center", gap: 10 },
  ham: { background: "none", border: "none", color: "var(--text)", fontSize: 22, cursor: "pointer", display: "none", padding: 0 },
  mobileMenu: { background: "var(--surface)", borderTop: "1px solid var(--border)", padding: "12px 20px", display: "flex", flexDirection: "column", gap: 4 },
  mobileLink: { padding: "10px 0", color: "var(--text)", textDecoration: "none", borderBottom: "1px solid var(--border)", fontSize: 15 },
};
