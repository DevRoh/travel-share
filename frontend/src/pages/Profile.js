import React, { useState } from "react";
import { updateProfile } from "../utils/api";
import { useAuth } from "../utils/AuthContext";

export default function Profile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || "", phone: user?.phone || "", city: user?.city || "Kolkata",
    emergencyName: user?.emergencyContact?.name || "", emergencyPhone: user?.emergencyContact?.phone || "",
    upiId: user?.upiId || "",
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const hc = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setSuccess(false);
    try {
      const r = await updateProfile({ 
        name: form.name, 
        phone: form.phone, 
        city: form.city, 
        emergencyContact: { name: form.emergencyName, phone: form.emergencyPhone },
        upiId: form.upiId
      });
      setUser(r.data.user); setSuccess(true);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px" }}>
      <h2 className="page-title">My Profile</h2>

      <div className="prof-hdr">
        <div className="avatar" style={{ width: 72, height: 72, fontSize: 28 }}>{user?.name?.[0]?.toUpperCase()}</div>
        <div>
          <div className="prof-name">{user?.name}</div>
          <div className="text-muted text-sm">{user?.email}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <span className="badge badge-green">★ {user?.rating?.toFixed(1)}</span>
            <span className="badge badge-blue">{user?.gender}</span>
            <span className="badge badge-gray">📍 {user?.city}</span>
          </div>
        </div>
      </div>

      <div className="prof-form">
        <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, marginBottom: 16 }}>Edit Profile</h3>
        <form onSubmit={handleSave}>
          <div className="form-row">
            <div className="form-group"><label>Full Name</label><input name="name" value={form.name} onChange={hc} /></div>
            <div className="form-group"><label>Phone</label><input name="phone" value={form.phone} onChange={hc} /></div>
          </div>
          <div className="form-group"><label>City</label>
            <select name="city" value={form.city} onChange={hc}>
              {["Kolkata","Delhi","Mumbai","Bengaluru"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>UPI ID (for receiving split payments)</label>
            <input 
              name="upiId" 
              placeholder="e.g. name@okaxis or 9876543210@paytm" 
              value={form.upiId} 
              onChange={hc} 
            />
            <span className="text-muted text-xs" style={{ marginTop: 4, display: "block" }}>Used to automatically generate payment QR codes for co-travelers.</span>
          </div>
          <div className="divider" />
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, marginBottom: 12 }}>🆘 Emergency Contact</h3>
          <div className="form-row">
            <div className="form-group"><label>Contact Name</label><input name="emergencyName" placeholder="Trusted person's name" value={form.emergencyName} onChange={hc} /></div>
            <div className="form-group"><label>Contact Phone</label><input name="emergencyPhone" placeholder="+91 XXXXXXXXXX" value={form.emergencyPhone} onChange={hc} /></div>
          </div>
          {success && <div className="success-banner">✅ Profile updated successfully!</div>}
          <button type="submit" className="btn btn-primary" style={{ padding: "11px 24px" }} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </div>

      <div className="safety-card">
        <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, marginBottom: 16 }}>🔒 Safety Tips</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 14, color: "var(--text2)" }}>
          {["Always verify your co-traveler's profile before sharing a ride.",
            "Share your trip details with a trusted contact.",
            "Meet in public places for pick-up.",
            "Trust your instincts — cancel if something feels wrong.",
            "Keep your emergency contact updated above."].map((t) => <div key={t}>• {t}</div>)}
        </div>
      </div>
    </div>
  );
}
