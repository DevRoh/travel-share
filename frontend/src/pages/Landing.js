import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const PROBLEMS = [
  { icon: "💸", title: "Solo travel is expensive", desc: "Travelling alone to college or work outside city limits costs a fortune — one person pays for the entire cab." },
  { icon: "👥", title: "Co-travelers are invisible", desc: "People going the same route at the same time have no way to find each other without informal WhatsApp chaos." },
  { icon: "🛡️", title: "No structured coordination", desc: "Existing ride-hailing apps only book commercial vehicles — there's no safe platform for ordinary people to coordinate." },
  { icon: "⏳", title: "Wasted opportunities daily", desc: "Every day, hundreds of overlapping trips happen with nobody aware — resulting in wasted money and high city traffic." },
];

const FEATURES = [
  { icon: "🚗", color: "#ff6b35", title: "Live Ride Sharing", desc: "Already in a cab? Post your ride and find someone going the same way to split the fare instantly." },
  { icon: "🤝", color: "#0084ff", title: "Find a Ride Partner", desc: "Need someone to travel with? Enter your route and time — our system finds people with matching journeys." },
  { icon: "📅", color: "#00c896", title: "Schedule Future Trips", desc: "Plan ahead. Coordinate with commuters in advance to ensure comfortable, budget-friendly travel." },
  { icon: "🔒", color: "#8b5cf6", title: "Verified Safety Profiles", desc: "Secure platform strictly for university students and corporate professionals with mandatory institution email validation." },
  { icon: "🗺️", color: "#f59e0b", title: "Smart Route Matching", desc: "Advanced geospatial path matching finds co-travelers taking the exact same route with minimal detours." },
  { icon: "💬", color: "#ec4899", title: "In-App Secure Chat", desc: "Real-time Socket.IO chat between matched travelers. Coordinate pickups without sharing phone numbers." },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Register & Verify", desc: "Create your profile with name, gender, city, and emergency contact for ultimate peace of mind." },
  { step: "02", title: "Choose Your Mode", desc: "Select: riding right now, need a travel partner, or schedule a future commute." },
  { step: "03", title: "Get Matched", desc: "The system finds co-travelers based on overlapping routes, departure timing, and matching preferences." },
  { step: "04", title: "Chat & Coordinate", desc: "Use in-app secure chat to agree on pickup points, share fares fairly, and travel together." },
];

const STATS = [
  { value: "10K+", label: "Verified Commuters" },
  { value: "4", label: "Indian Cities" },
  { value: "0%", label: "Commission" },
  { value: "₹0", label: "Platform Fee" },
];

export default function Landing() {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = width <= 768;

  useEffect(() => {
    const el = heroRef.current;
    if (!el || isMobile) return;
    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 20;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 20;
      el.style.setProperty("--mx", `${x}px`);
      el.style.setProperty("--my", `${y}px`);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [isMobile]);

  return (
    <div style={styles.page}>
      {/* ── NAV ── */}
      <nav style={styles.nav}>
        <div style={styles.navInner}>
          <div style={styles.brand} onClick={() => navigate("/")}>
            <span style={{ fontSize: 24 }}>🚗</span>
            <span style={styles.brandText}>TravelShare</span>
          </div>
          <div style={{ ...styles.navLinks, display: isMobile ? "none" : "flex" }}>
            <a href="#features" style={styles.navLink}>Features</a>
            <a href="#how" style={styles.navLink}>How it Works</a>
            <a href="#architecture" style={styles.navLink}>Architecture</a>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn btn-ghost" style={styles.btnGhost} onClick={() => navigate("/login")}>
              Sign In
            </button>
            <button className="btn btn-primary" style={styles.btnPrimaryNav} onClick={() => navigate("/register")}>
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section ref={heroRef} style={{ ...styles.hero, flexDirection: isMobile ? "column" : "row", gap: isMobile ? 30 : 60, padding: isMobile ? "40px 20px" : "60px 24px", textAlign: isMobile ? "center" : "left", minHeight: isMobile ? "auto" : "85vh" }}>
        <div style={styles.heroGlow1} />
        <div style={styles.heroGlow2} />
        <div style={styles.heroGlow3} />

        <div style={styles.heroContent}>
          <div style={styles.heroBadge}>
            🎓 MSIT B.Tech Project · Dept. of IT · TravelShare
          </div>
          <h1 style={{ ...styles.heroTitle, fontSize: isMobile ? "34px" : "56px" }}>
            Travel Together,<br />
            <span style={styles.heroTitleAccent}>Save Together</span>
          </h1>
          <p style={{ ...styles.heroSub, margin: isMobile ? "0 auto 24px" : "0 0 36px" }}>
            A peer-to-peer travel coordination platform for students and commuters.
            Find co-travelers on your route, split costs transparently, and coordinate
            safely with verified institutional peers.
          </p>
          <div style={{ ...styles.heroCTAs, justifyContent: isMobile ? "center" : "flex-start" }}>
            <button
              className="btn btn-primary"
              style={styles.heroBtnPrimary}
              onClick={() => navigate("/register")}
            >
              🚀 Start Sharing Trips
            </button>
            <button
              className="btn btn-secondary"
              style={styles.heroBtnSecondary}
              onClick={() => navigate("/login")}
            >
              Sign In →
            </button>
          </div>

          {/* Stats strip */}
          <div style={{ ...styles.statsStrip, justifyContent: isMobile ? "center" : "flex-start", flexWrap: "wrap", gap: isMobile ? 24 : 40 }}>
            {STATS.map((s) => (
              <div key={s.label} style={styles.statItem}>
                <div style={styles.statValue}>{s.value}</div>
                <div style={styles.statLabel}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Hero visual mockup */}
        <div style={{ ...styles.heroVisual, display: isMobile ? "none" : "flex" }}>
          {/* Card Mockup */}
          <div style={styles.mockupCard}>
            <div style={{ fontSize: 11, color: "var(--accent)", marginBottom: 10, letterSpacing: "0.06em", fontWeight: 700, textTransform: "uppercase" }}>🟢 ACTIVE POST</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div className="avatar" style={{ width: 36, height: 36, fontSize: 14 }}>J</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)" }}>John Doe</div>
                <div style={{ fontSize: 11, color: "var(--text2)" }}>MSIT Commuter · Male</div>
              </div>
              <span className="badge badge-green" style={{ marginLeft: "auto", fontSize: 9 }}>Scheduled</span>
            </div>

            <div style={{ fontSize: 13, borderLeft: "2px solid var(--accent)", paddingLeft: 10, marginBottom: 12 }}>
              <div style={{ color: "var(--text3)", fontSize: 10, fontWeight: 700, marginBottom: 2 }}>FROM</div>
              <div style={{ fontWeight: 600, color: "var(--text)" }}>Salt Lake Sector V, Kolkata</div>
              <div style={{ color: "var(--text3)", fontSize: 10, fontWeight: 700, margin: "6px 0 2px" }}>TO</div>
              <div style={{ fontWeight: 600, color: "var(--text)" }}>Park Street, Kolkata</div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <div className="chip" style={{ fontSize: 11, padding: "3px 8px" }}>🕐 Today, 05:30 PM</div>
              <div className="chip" style={{ fontSize: 11, padding: "3px 8px" }}>💺 2 seats left</div>
            </div>

            <div style={{ padding: "10px", background: "rgba(0,132,255,0.08)", borderRadius: 8, border: "1px solid rgba(0,132,255,0.15)" }}>
              <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4, fontWeight: 600 }}>💸 Transparent Cost Sharing</div>
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 10, color: "var(--text3)" }}>Total Cab Fare</div>
                  <div style={{ color: "var(--text)", fontWeight: 700 }}>₹185</div>
                </div>
                <div style={{ borderLeft: "1px solid var(--border)", paddingLeft: 16 }}>
                  <div style={{ fontSize: 10, color: "var(--text3)" }}>Split Per Person</div>
                  <div style={{ color: "#00c896", fontWeight: 700, fontSize: 15 }}>₹92</div>
                </div>
              </div>
            </div>
          </div>

          {/* Safety Check mockup */}
          <div style={styles.mockupMatch}>
            <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 8, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>🛡️ Safety Verification</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "Emergency Contact", status: "Verified", color: "#00c896" },
                { label: "Institutional Email", status: "Verified", color: "#00c896" },
                { label: "Matched Route", status: "Excellent Match", color: "#0084ff" }
              ].map((item, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--text2)", fontSize: 12 }}>{item.label}</span>
                  <span style={{
                    background: `${item.color}15`,
                    color: item.color,
                    padding: "2px 8px",
                    borderRadius: 12,
                    fontSize: 10,
                    fontWeight: 700
                  }}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PROBLEMS ── */}
      <section style={styles.section}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>The Problem We Solve</h2>
          <p style={styles.sectionSub}>Every day, thousands of overlapping commutes happen with zero coordination.</p>
          <div style={styles.problemGrid}>
            {PROBLEMS.map((p, idx) => (
              <div key={idx} style={styles.problemCard}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>{p.icon}</div>
                <h3 style={styles.problemTitle}>{p.title}</h3>
                <p style={styles.problemDesc}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ ...styles.section, background: "rgba(17, 24, 39, 0.4)" }}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>Features</h2>
          <p style={styles.sectionSub}>Everything you need to coordinate travel safely, easily, and affordably.</p>
          <div style={styles.featureGrid}>
            {FEATURES.map((f, idx) => (
              <div key={idx} style={{ ...styles.featureCard, "--fc": f.color }}>
                <div style={{ ...styles.featureIcon, background: `${f.color}12`, color: f.color }}>
                  {f.icon}
                </div>
                <h3 style={styles.featureTitle}>{f.title}</h3>
                <p style={styles.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" style={styles.section}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>How It Works</h2>
          <p style={styles.sectionSub}>Four simple steps to start sharing commutes safely.</p>
          <div style={styles.stepsGrid}>
            {HOW_IT_WORKS.map((s, i) => (
              <div key={s.step} style={styles.stepCard}>
                <div style={styles.stepNum}>{s.step}</div>
                {i < HOW_IT_WORKS.length - 1 && <div style={styles.stepArrow}>→</div>}
                <h3 style={styles.stepTitle}>{s.title}</h3>
                <p style={styles.stepDesc}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SYSTEM ARCHITECTURE ── */}
      <section id="architecture" style={{ ...styles.section, background: "rgba(17, 24, 39, 0.4)" }}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>System Architecture</h2>
          <p style={styles.sectionSub}>A transparent, lightweight, and modern stack built for speed and security.</p>
          <div style={styles.archGrid}>
            {[
              { icon: "⚛️", label: "Frontend App", tech: "React.js + Hooks", color: "#61dafb", items: ["Login / Register Cards", "Interactive Dashboard", "Active Trip Posting", "Live Notifications", "Emergency Settings"] },
              { icon: "⚙️", label: "Backend API", tech: "Node.js + Express", color: "#68a063", items: ["JWT Secure Auth", "Trip Coordination API", "Geospatial Query Routing", "Fare Allocation Logic", "Active Websocket Transport"] },
              { icon: "🗄️", label: "Database Engine", tech: "MongoDB + Mongoose", color: "#13aa52", items: ["Indexed GeoQueries", "User Credential Store", "Active Trips Collection", "Socket Messages Collection", "Mongoose Schemas & Hooks"] },
              { icon: "💬", label: "Real-Time Engine", tech: "Socket.IO Protocol", color: "#f59e0b", items: ["Real-time in-app chat", "Instant match notifications", "Active lobby updates", "Secure message logs", "Low-latency state sync"] },
            ].map((a, idx) => (
              <div key={idx} style={{ ...styles.archCard, borderTop: `3px solid ${a.color}` }}>
                <div style={{ fontSize: 26, marginBottom: 8 }}>{a.icon}</div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "var(--text)" }}>{a.label}</div>
                <div style={{ fontSize: 12, color: a.color, marginBottom: 12, fontWeight: 600 }}>{a.tech}</div>
                {a.items.map((item) => (
                  <div key={item} style={styles.archItem}>
                    • {item}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ ...styles.ctaSection, padding: isMobile ? "60px 20px" : "110px 24px" }}>
        <div style={styles.ctaGlow} />
        <h2 style={{ ...styles.ctaTitle, fontSize: isMobile ? "28px" : "44px" }}>Ready to share your next commute?</h2>
        <p style={styles.ctaSub}>Join your institutional peers. Find your route partner. Travel smarter.</p>
        <button
          className="btn btn-primary"
          style={styles.ctaBtn}
          onClick={() => navigate("/register")}
        >
          🚗 Get Started Free
        </button>
      </section>

      {/* ── FOOTER ── */}
      <footer style={styles.footer}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text)" }}>🚗 TravelShare</div>
        <div style={{ color: "var(--text3)", fontSize: 13, lineHeight: 1.5 }}>
          B.Tech Project · MSIT Dept. of IT · Dec 2025 · Soumyadip Pal, Rohit Paul, Saptarshi Ghosh, Jitendrio Saha
        </div>
      </footer>
    </div>
  );
}

const styles = {
  page: {
    background: "#060913",
    color: "var(--text)",
    minHeight: "100vh",
    fontFamily: "var(--font-body)",
    overflowX: "hidden"
  },

  // Nav
  nav: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    background: "rgba(6, 9, 19, 0.85)",
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid rgba(30, 45, 69, 0.4)",
    height: "64px"
  },
  navInner: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "0 24px",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    cursor: "pointer"
  },
  brandText: {
    fontFamily: "var(--font-display)",
    fontWeight: 800,
    fontSize: 21,
    background: "linear-gradient(135deg, #00c896 0%, #0084ff 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent"
  },
  navLinks: {
    display: "flex",
    gap: 8
  },
  navLink: {
    padding: "6px 14px",
    borderRadius: 8,
    fontSize: 14,
    color: "var(--text2)",
    textDecoration: "none",
    fontWeight: 500,
    transition: "all 0.15s ease",
    ":hover": {
      color: "var(--text)"
    }
  },
  btnGhost: {
    padding: "8px 18px",
    fontSize: "13px",
    fontWeight: 600,
    borderRadius: "8px",
    color: "var(--accent)",
    border: "1px solid var(--accent)",
    background: "transparent",
    transition: "all 0.2s ease"
  },
  btnPrimaryNav: {
    padding: "8px 18px",
    fontSize: "13px",
    fontWeight: 700,
    borderRadius: "8px",
    background: "linear-gradient(135deg, #00c896 0%, #00a57c 100%)",
    color: "#050711",
    boxShadow: "0 4px 14px rgba(0, 200, 150, 0.2)"
  },

  // Hero
  hero: {
    position: "relative",
    overflow: "hidden",
    minHeight: "85vh",
    display: "flex",
    alignItems: "center",
    padding: "60px 24px",
    maxWidth: 1100,
    margin: "0 auto",
    gap: 60
  },
  heroGlow1: {
    position: "absolute",
    top: -150,
    left: -150,
    width: 500,
    height: 500,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(0,200,150,0.07) 0%, transparent 70%)",
    pointerEvents: "none"
  },
  heroGlow2: {
    position: "absolute",
    bottom: -150,
    right: -150,
    width: 500,
    height: 500,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(0,132,255,0.07) 0%, transparent 70%)",
    pointerEvents: "none"
  },
  heroGlow3: {
    position: "absolute",
    top: "30%",
    left: "40%",
    width: 400,
    height: 400,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(139,92,246,0.04) 0%, transparent 70%)",
    pointerEvents: "none"
  },
  heroContent: {
    flex: 1,
    position: "relative",
    zIndex: 2
  },
  heroBadge: {
    display: "inline-block",
    background: "rgba(0,200,150,0.08)",
    border: "1px solid rgba(0,200,150,0.25)",
    borderRadius: 20,
    padding: "6px 14px",
    fontSize: "12px",
    color: "var(--accent)",
    marginBottom: 20,
    fontWeight: 600
  },
  heroTitle: {
    fontFamily: "var(--font-display)",
    fontSize: "56px",
    fontWeight: 800,
    lineHeight: 1.1,
    marginBottom: 20,
    letterSpacing: "-0.5px"
  },
  heroTitleAccent: {
    background: "linear-gradient(135deg, #00c896 0%, #0084ff 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent"
  },
  heroSub: {
    fontSize: "17px",
    color: "var(--text2)",
    lineHeight: 1.6,
    marginBottom: 36,
    maxWidth: 520
  },
  heroCTAs: {
    display: "flex",
    gap: 16,
    marginBottom: 48,
    flexWrap: "wrap"
  },
  heroBtnPrimary: {
    padding: "14px 30px",
    fontSize: "15px",
    borderRadius: "10px",
    fontWeight: 700,
    background: "linear-gradient(135deg, #00c896 0%, #00a57c 100%)",
    color: "#050711",
    boxShadow: "0 4px 20px rgba(0, 200, 150, 0.25)"
  },
  heroBtnSecondary: {
    padding: "14px 30px",
    fontSize: "15px",
    borderRadius: "10px",
    fontWeight: 600,
    background: "rgba(30, 45, 69, 0.35)",
    border: "1px solid rgba(30, 45, 69, 0.6)",
    color: "var(--text)"
  },
  statsStrip: {
    display: "flex",
    gap: 40,
    borderTop: "1px solid rgba(30, 45, 69, 0.4)",
    paddingTop: 28
  },
  statItem: {},
  statValue: {
    fontFamily: "var(--font-display)",
    fontSize: "28px",
    fontWeight: 800,
    color: "var(--accent)"
  },
  statLabel: {
    fontSize: "11px",
    color: "var(--text3)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    fontWeight: 700
  },

  // Hero Visual
  heroVisual: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    width: "310px",
    flexShrink: 0,
    zIndex: 2,
    "@media (max-width: 992px)": {
      display: "none"
    }
  },
  mockupCard: {
    background: "rgba(17, 24, 39, 0.65)",
    border: "1px solid rgba(255, 255, 255, 0.06)",
    borderRadius: "16px",
    padding: 20,
    backdropFilter: "blur(12px)",
    boxShadow: "0 20px 50px rgba(0,0,0,0.5)"
  },
  mockupMatch: {
    background: "rgba(17, 24, 39, 0.5)",
    border: "1px solid rgba(255, 255, 255, 0.05)",
    borderRadius: "16px",
    padding: 16,
    backdropFilter: "blur(12px)"
  },

  // Sections
  section: {
    padding: "90px 24px"
  },
  sectionInner: {
    maxWidth: 1100,
    margin: "0 auto"
  },
  sectionTitle: {
    fontFamily: "var(--font-display)",
    fontSize: "36px",
    fontWeight: 800,
    textAlign: "center",
    color: "var(--text)",
    marginBottom: 10,
    letterSpacing: "-0.5px"
  },
  sectionSub: {
    color: "var(--text2)",
    textAlign: "center",
    fontSize: "16px",
    marginBottom: 52,
    maxWidth: 540,
    margin: "0 auto 52px",
    lineHeight: 1.5
  },

  // Problems
  problemGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 24
  },
  problemCard: {
    background: "rgba(17, 24, 39, 0.4)",
    border: "1px solid rgba(30, 45, 69, 0.4)",
    borderRadius: "16px",
    padding: 24,
    transition: "all 0.2s ease",
    ":hover": {
      borderColor: "var(--accent)"
    }
  },
  problemTitle: {
    fontFamily: "var(--font-display)",
    fontSize: "17px",
    fontWeight: 700,
    color: "var(--text)",
    marginBottom: 8
  },
  problemDesc: {
    fontSize: "13px",
    color: "var(--text2)",
    lineHeight: 1.6
  },

  // Features
  featureGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 24
  },
  featureCard: {
    background: "rgba(17, 24, 39, 0.35)",
    border: "1px solid rgba(30, 45, 69, 0.3)",
    borderRadius: "16px",
    padding: 28,
    transition: "all 0.25s ease"
  },
  featureIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "22px",
    marginBottom: 16,
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)"
  },
  featureTitle: {
    fontFamily: "var(--font-display)",
    fontSize: "18px",
    fontWeight: 700,
    color: "var(--text)",
    marginBottom: 8
  },
  featureDesc: {
    fontSize: "13px",
    color: "var(--text2)",
    lineHeight: 1.6
  },

  // Steps
  stepsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 24,
    position: "relative"
  },
  stepCard: {
    background: "rgba(17, 24, 39, 0.4)",
    border: "1px solid rgba(30, 45, 69, 0.4)",
    borderRadius: "16px",
    padding: 24,
    position: "relative"
  },
  stepNum: {
    fontFamily: "var(--font-display)",
    fontSize: "44px",
    fontWeight: 800,
    color: "rgba(30, 45, 69, 0.5)",
    marginBottom: 12,
    lineHeight: 1
  },
  stepArrow: {
    position: "absolute",
    right: -14,
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: "20px",
    color: "var(--accent)",
    zIndex: 2,
    "@media (max-width: 992px)": {
      display: "none"
    }
  },
  stepTitle: {
    fontFamily: "var(--font-display)",
    fontSize: "17px",
    fontWeight: 700,
    color: "var(--text)",
    marginBottom: 8
  },
  stepDesc: {
    fontSize: "13px",
    color: "var(--text2)",
    lineHeight: 1.6
  },

  // Arch
  archGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 24
  },
  archCard: {
    background: "rgba(17, 24, 39, 0.4)",
    border: "1px solid rgba(30, 45, 69, 0.4)",
    borderRadius: "16px",
    padding: 24
  },
  archItem: {
    fontSize: "12px",
    color: "var(--text2)",
    padding: "6px 0",
    borderBottom: "1px solid rgba(30, 45, 69, 0.3)"
  },

  // CTA
  ctaSection: {
    padding: "110px 24px",
    textAlign: "center",
    position: "relative",
    overflow: "hidden",
    borderTop: "1px solid rgba(30, 45, 69, 0.3)"
  },
  ctaGlow: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%,-50%)",
    width: "600px",
    height: "300px",
    borderRadius: "50%",
    background: "radial-gradient(ellipse, rgba(0,200,150,0.06) 0%, transparent 70%)",
    pointerEvents: "none"
  },
  ctaTitle: {
    fontFamily: "var(--font-display)",
    fontSize: "44px",
    fontWeight: 800,
    color: "var(--text)",
    marginBottom: 16,
    letterSpacing: "-0.5px"
  },
  ctaSub: {
    color: "var(--text2)",
    fontSize: "17px",
    marginBottom: 36
  },
  ctaBtn: {
    padding: "16px 40px",
    fontSize: "16px",
    borderRadius: "12px",
    fontWeight: 700,
    background: "linear-gradient(135deg, #00c896 0%, #00a57c 100%)",
    color: "#050711",
    boxShadow: "0 4px 20px rgba(0, 200, 150, 0.25)"
  },

  // Footer
  footer: {
    background: "#03050b",
    borderTop: "1px solid rgba(30, 45, 69, 0.4)",
    padding: "40px 24px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    gap: 12
  },
};
