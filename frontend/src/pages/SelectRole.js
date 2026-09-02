import { useNavigate } from "react-router-dom";

export default function SelectRole() {
  const navigate = useNavigate();

  return (
    <div className="role-page">
      <div className="role-container">

        {/* Logo */}
        <div className="role-logo">🩸</div>

        {/* App name */}
        <h1 className="role-app-name">
          Life<span>Link</span>
        </h1>

        <p className="role-tagline">
          Emergency Blood Donation Network
        </p>

        <div className="role-divider" />

        {/* ── DONOR ──────────────────────────────────────────────── */}
        <p className="role-section-label">👤 Donor</p>
        <div className="role-btn-row" style={{ marginBottom: "24px" }}>
          <div className="role-card" onClick={() => navigate("/donor-login")}>
            <span className="role-card-icon">🩸</span>
            <span className="role-card-label">Login</span>
            <span className="role-card-sub">Respond to SOS alerts</span>
          </div>
        </div>

        <div className="role-divider" />

        {/* ── HOSPITAL ───────────────────────────────────────────── */}
        <p className="role-section-label">🏥 Hospital</p>
        <div className="role-btn-row">
          <div className="role-card" onClick={() => navigate("/hospital-login")}>
            <span className="role-card-icon">🏥</span>
            <span className="role-card-label">Login</span>
            <span className="role-card-sub">Send emergency SOS</span>
          </div>
          {/* <div className="role-card role-card-outline" onClick={() => navigate("/hospital-register")}>
            <span className="role-card-icon">📋</span>
            <span className="role-card-label">Register</span>
            <span className="role-card-sub">New hospital account</span>
          </div> */}
        </div>

        {/* ── HEALTH AWARENESS STRIP ─────────────────────────────── */}
        <div className="role-health-strip">
          <span className="role-health-icon">❤️</span>
          <p className="role-health-text">
            <strong>One donation saves up to 3 lives.</strong>{" "}<br></br>
            Eligible donors can give blood every 90 days (male) or 120 days (female).
            Be a hero — register today.
          </p>
        </div>

      </div>
    </div>
  );
}