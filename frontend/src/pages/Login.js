import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser, registerUser } from "../utils/api";
import { useAuth } from "../utils/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try { 
      const r = await loginUser(form); 
      login(r.data.token, r.data.user); 
      navigate("/dashboard"); 
    }
    catch (err) { 
      setError(err.response?.data?.error || "Login failed. Check your credentials."); 
    }
    finally { 
      setLoading(false); 
    }
  };

  const handleDemoLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const timestamp = Date.now();
      const demoEmail = `demo_${timestamp}@demo.com`;
      const demoUser = {
        name: `Demo User ${timestamp.toString().slice(-4)}`,
        email: demoEmail,
        phone: `98765${timestamp.toString().slice(-5)}`,
        password: "demo123",
        gender: Math.random() > 0.5 ? "Male" : "Female",
        city: "Kolkata",
        upiId: `demo_${timestamp.toString().slice(-4)}@upi`,
        emergencyContact: {
          name: "Emergency Contact",
          phone: "9000000000"
        }
      };

      await registerUser(demoUser);
      const r = await loginUser({ email: demoEmail, password: "demo123" });
      login(r.data.token, r.data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Instant demo login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      {/* Left hero panel */}
      <div style={S.hero}>
        <div style={S.meshGlow1} />
        <div style={S.meshGlow2} />
        <div style={S.meshGlow3} />
        
        <div style={S.heroContent}>
          <div style={S.logoContainer}>
            <span style={S.logoIcon}>🚗</span>
            <h1 style={S.heroTitle}>TravelShare</h1>
          </div>
          
          <p style={S.heroSub}>
            Connect with verified co-travelers, share routes, split commute costs, and travel smarter.
          </p>

          <div style={S.featureList}>
            {[
              { title: "Real-Time Matching", desc: "Instantly pair with riders heading your exact direction.", icon: "🎯" },
              { title: "Transparent Cost Splitting", desc: "No markups, no hidden fees. Split actual commute fares.", icon: "💸" },
              { title: "Safe In-App Coordination", desc: "Verified student and professional profiles with emergency contacts.", icon: "🛡️" },
              { title: "Eco-Friendly Commutes", desc: "Reduce city traffic and carbon footprint with every shared trip.", icon: "🌿" }
            ].map((f, idx) => (
              <div key={idx} style={S.featureItem}>
                <div style={S.featureIconBg}>{f.icon}</div>
                <div>
                  <h4 style={S.featureItemTitle}>{f.title}</h4>
                  <p style={S.featureItemDesc}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Decorative glass mockup */}
        <div style={S.floatingMockup}>
          <div style={S.mockupHeader}>
            <span style={{ fontSize: 13, color: "var(--accent)", fontWeight: 700 }}>● LIVE MATCH</span>
            <span style={{ color: "var(--text3)", fontSize: 11 }}>1 min ago</span>
          </div>
          <div style={S.mockupProfile}>
            <div style={S.mockupAvatar}>R</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>Rohit Paul</div>
              <div style={{ fontSize: 11, color: "var(--text2)" }}>MSIT Commuter · Route Overlaps</div>
            </div>
          </div>
          <div style={S.mockupRoute}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ color: "var(--accent)", fontSize: 10 }}>●</span>
              <span style={{ color: "var(--text2)", fontSize: 12 }}>Salt Lake Sector V</span>
            </div>
            <div style={{ width: 1, height: 12, background: "var(--border)", marginLeft: 4, margin: "2px 0" }} />
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ color: "var(--accent2)", fontSize: 10 }}>●</span>
              <span style={{ color: "var(--text2)", fontSize: 12 }}>New Town Action Area 1</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div style={S.formPanel}>
        <div style={S.formCard}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <h2 style={S.formTitle}>Welcome Back</h2>
            <p style={S.formSubtitle}>Enter your details to find your next travel partner</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label style={S.inputLabel}>EMAIL ADDRESS</label>
              <input 
                type="email" 
                name="email" 
                placeholder="you@example.com" 
                value={form.email} 
                onChange={(e) => setForm({...form, email: e.target.value})} 
                style={S.inputField}
                required 
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: 24 }}>
              <label style={S.inputLabel}>PASSWORD</label>
              <input 
                type="password" 
                name="password" 
                placeholder="••••••••" 
                value={form.password} 
                onChange={(e) => setForm({...form, password: e.target.value})} 
                style={S.inputField}
                required 
              />
            </div>

            {error && <div className="error-text" style={S.errorContainer}>{error}</div>}

            <button 
              type="submit" 
              className="btn btn-primary w-full" 
              style={S.submitBtn} 
              disabled={loading}
            >
              {loading ? "Verifying Credentials…" : "Sign In"}
            </button>
          </form>

          <p style={S.registerText}>
            Don't have an account? <Link to="/register" style={S.registerLink}>Create one now</Link>
          </p>

          {process.env.NODE_ENV !== "production" && (
            <>
              <div style={S.dividerContainer}>
                <div style={S.dividerLine} />
                <span style={S.dividerText}>DEMO MODE</span>
                <div style={S.dividerLine} />
              </div>

              <button 
                type="button" 
                onClick={handleDemoLogin} 
                style={S.demoBtn}
                disabled={loading}
              >
                {loading ? "Logging in..." : "⚡ Instant Demo Login"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const S = {
  page: { 
    display: "flex", 
    minHeight: "100vh", 
    background: "#060913",
    fontFamily: "var(--font-body)",
    overflow: "hidden"
  },
  
  // Left hero panel
  hero: { 
    flex: 1.2, 
    background: "radial-gradient(circle at 10% 20%, #0c122c 0%, #050711 100%)", 
    display: "flex", 
    flexDirection: "column",
    justifyContent: "center",
    padding: "60px 80px", 
    position: "relative", 
    overflow: "hidden",
    borderRight: "1px solid rgba(30, 45, 69, 0.5)",
    "@media (max-width: 992px)": {
      display: "none"
    }
  },
  meshGlow1: { 
    position: "absolute", 
    top: "10%", 
    left: "-10%", 
    width: "450px", 
    height: "450px", 
    borderRadius: "50%", 
    background: "radial-gradient(circle, rgba(0, 200, 150, 0.08) 0%, transparent 70%)", 
    pointerEvents: "none" 
  },
  meshGlow2: { 
    position: "absolute", 
    bottom: "5%", 
    right: "-10%", 
    width: "500px", 
    height: "500px", 
    borderRadius: "50%", 
    background: "radial-gradient(circle, rgba(0, 132, 255, 0.08) 0%, transparent 70%)", 
    pointerEvents: "none" 
  },
  meshGlow3: {
    position: "absolute",
    top: "40%",
    right: "20%",
    width: "300px",
    height: "300px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(139, 92, 246, 0.05) 0%, transparent 75%)",
    pointerEvents: "none"
  },
  heroContent: { 
    position: "relative", 
    zIndex: 2, 
    maxWidth: "540px" 
  },
  logoContainer: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    marginBottom: 20
  },
  logoIcon: {
    fontSize: "36px",
    filter: "drop-shadow(0 4px 12px rgba(0, 200, 150, 0.3))"
  },
  heroTitle: { 
    fontFamily: "var(--font-display)", 
    fontSize: "42px", 
    fontWeight: 800, 
    background: "linear-gradient(135deg, #00c896 0%, #0084ff 100%)", 
    WebkitBackgroundClip: "text", 
    WebkitTextFillColor: "transparent", 
    letterSpacing: "-0.5px"
  },
  heroSub: { 
    color: "var(--text2)", 
    fontSize: "17px", 
    lineHeight: 1.6, 
    marginBottom: 40 
  },
  featureList: { 
    display: "flex", 
    flexDirection: "column", 
    gap: 24 
  },
  featureItem: { 
    display: "flex", 
    gap: 16, 
    alignItems: "flex-start" 
  },
  featureIconBg: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    background: "rgba(255, 255, 255, 0.03)",
    border: "1px solid rgba(255, 255, 255, 0.05)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    flexShrink: 0,
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)"
  },
  featureItemTitle: {
    fontFamily: "var(--font-display)",
    fontSize: "15px",
    fontWeight: 700,
    color: "var(--text)",
    marginBottom: 4
  },
  featureItemDesc: {
    fontSize: "13px",
    color: "var(--text2)",
    lineHeight: 1.5
  },
  floatingMockup: {
    position: "absolute",
    bottom: "40px",
    right: "40px",
    width: "280px",
    background: "rgba(17, 24, 39, 0.65)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "16px",
    padding: "16px",
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
    transform: "rotate(-2deg)",
    zIndex: 3,
    pointerEvents: "none"
  },
  mockupHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12
  },
  mockupProfile: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    marginBottom: 12
  },
  mockupAvatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #0084ff, #8b5cf6)",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: 700
  },
  mockupRoute: {
    background: "rgba(0, 0, 0, 0.2)",
    borderRadius: "8px",
    padding: "8px 10px",
    border: "1px solid rgba(255, 255, 255, 0.03)"
  },

  // Right form panel
  formPanel: { 
    width: "460px", 
    background: "#070a16", 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center", 
    padding: "40px",
    position: "relative",
    zIndex: 2,
    flexShrink: 0
  },
  formCard: {
    width: "100%",
    maxWidth: "360px"
  },
  formTitle: { 
    fontFamily: "var(--font-display)", 
    fontSize: "32px", 
    fontWeight: 800, 
    color: "var(--text)",
    marginBottom: 8,
    letterSpacing: "-0.5px"
  },
  formSubtitle: { 
    color: "var(--text2)", 
    fontSize: "14px"
  },
  inputLabel: {
    fontSize: "11px",
    fontWeight: 700,
    color: "var(--text2)",
    letterSpacing: "1.5px",
    marginBottom: 8
  },
  inputField: {
    background: "rgba(17, 24, 37, 0.6)",
    border: "1px solid rgba(30, 45, 69, 0.8)",
    borderRadius: "10px",
    color: "var(--text)",
    padding: "12px 16px",
    fontSize: "15px",
    transition: "all 0.2s ease",
    outline: "none"
  },
  errorContainer: {
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.2)",
    borderRadius: "8px",
    padding: "10px 12px",
    fontSize: "13px",
    color: "var(--error)",
    marginBottom: 16,
    textAlign: "center"
  },
  submitBtn: {
    padding: "14px",
    fontSize: "15px",
    fontWeight: 700,
    borderRadius: "10px",
    background: "linear-gradient(135deg, #00c896 0%, #00a57c 100%)",
    color: "#050711",
    boxShadow: "0 4px 20px rgba(0, 200, 150, 0.25)",
    transition: "all 0.2s ease"
  },
  registerText: { 
    textAlign: "center", 
    color: "var(--text2)", 
    fontSize: "14px", 
    marginTop: 24 
  },
  registerLink: { 
    color: "var(--accent)", 
    fontWeight: 600,
    textDecoration: "none",
    borderBottom: "1px solid transparent",
    transition: "all 0.15s ease"
  },
  dividerContainer: {
    display: "flex",
    alignItems: "center",
    margin: "32px 0 20px",
    gap: 12
  },
  dividerLine: {
    flex: 1,
    height: "1px",
    background: "rgba(30, 45, 69, 0.6)"
  },
  dividerText: {
    fontSize: "10px",
    fontWeight: 700,
    color: "var(--text3)",
    letterSpacing: "1px"
  },
  demoBtn: {
    width: "100%",
    background: "rgba(30, 45, 69, 0.35)",
    border: "1px solid rgba(30, 45, 69, 0.6)",
    color: "var(--text2)",
    padding: "11px",
    fontSize: "13px",
    fontWeight: 600,
    borderRadius: "10px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    textAlign: "center"
  }
};

