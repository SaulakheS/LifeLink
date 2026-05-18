import { useNavigate } from "react-router-dom";

export default function SelectRole() {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <h1 style={styles.appName}>🩸 LifeLink</h1>
      <p style={styles.tagline}>Emergency Blood Donation Network</p>

      {/* ── DONOR SECTION ──────────────────────────────────── */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>👤 Donor</h3>
        <div style={styles.btnRow}>
          <div style={styles.card} onClick={() => navigate("/donor-login")}>
            <p style={styles.cardLabel}>Login</p>
          </div>
        </div>
      </div>

      {/* ── HOSPITAL SECTION ───────────────────────────────── */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>🏥 Hospital</h3>
        <div style={styles.btnRow}>
          <div style={styles.card} onClick={() => navigate("/hospital-login")}>
            <p style={styles.cardLabel}>Login</p>
          </div>
          <div
            style={{ ...styles.card, ...styles.cardOutline }}
            onClick={() => navigate("/hospital-register")}
          >
            <p style={styles.cardLabel}>Register</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#f4f6f9",
    gap: "20px",
    padding: "20px",
  },
  appName: {
    fontSize: "36px",
    color: "#c0392b",
    margin: 0,
  },
  tagline: {
    color: "#888",
    margin: "0 0 10px",
    fontSize: "14px",
  },
  section: {
    textAlign: "center",
  },
  sectionTitle: {
    color: "#2c3e50",
    margin: "0 0 10px",
  },
  btnRow: {
    display: "flex",
    gap: "14px",
    justifyContent: "center",
  },
  card: {
    width: "130px",
    padding: "18px 10px",
    background: "#fff",
    borderRadius: "12px",
    textAlign: "center",
    cursor: "pointer",
    boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
    border: "2px solid transparent",
    transition: "0.2s",
  },
  cardOutline: {
    border: "2px solid #2c3e50",
    background: "transparent",
    boxShadow: "none",
  },
  cardLabel: {
    margin: 0,
    fontWeight: 600,
    color: "#2c3e50",
    fontSize: "15px",
  },
};