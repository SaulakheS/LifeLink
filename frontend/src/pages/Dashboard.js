import { useEffect, useState, useCallback } from "react";
import { io } from "socket.io-client";
import Notification from "../components/Notification";
import CertificatePreview from "../components/CertificatePreview";
import { useNavigate } from "react-router-dom";
import API_BASE from "../config";
import "./Dashboard.css";

const RESPONSE_CONFIG = {
  ACCEPTED:      { color: "#27ae60", bg: "#eafaf1", icon: "✅", label: "Accepted"      },
  REJECTED:      { color: "#e67e22", bg: "#fef9e7", icon: "↩️", label: "Declined"      },
  NOT_RESPONDED: { color: "#7f8c8d", bg: "#f2f3f4", icon: "⏱",  label: "Not Responded" },
};

export default function Dashboard() {
  const [messages, setMessages]             = useState([]);
  const [donorName, setDonorName]           = useState("");
  const [history, setHistory]               = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [certificates, setCertificates]     = useState([]);
  const [certsLoading, setCertsLoading]     = useState(true);
  const [activeTab, setActiveTab]           = useState("live");
  const [previewCert, setPreviewCert]       = useState(null);
  const navigate = useNavigate();

  const logout = async () => {
    const token = localStorage.getItem("token");
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        headers: { "Authorization": token },
      });
    } catch {}
    localStorage.removeItem("donor_id");
    localStorage.removeItem("donor_name");
    localStorage.removeItem("token");
    navigate("/");
  };

  const fetchHistory = useCallback(async () => {
    const token = localStorage.getItem("token");
    try {
      setHistoryLoading(true);
      const res = await fetch(`${API_BASE}/donors/history`, {
        headers: { "Authorization": token },
      });
      const data = await res.json();
      if (res.ok) setHistory(data);
    } catch (err) {
      console.error("History fetch error:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const fetchCertificates = useCallback(async () => {
    const token = localStorage.getItem("token");
    try {
      setCertsLoading(true);
      const res = await fetch(`${API_BASE}/certificates/my`, {
        headers: { "Authorization": token },
      });
      const data = await res.json();
      if (res.ok) setCertificates(data);
    } catch (err) {
      console.error("Certificates fetch error:", err);
    } finally {
      setCertsLoading(false);
    }
  }, []);

  useEffect(() => {
    const donorId = localStorage.getItem("donor_id");
    const name    = localStorage.getItem("donor_name");
    if (!donorId) { navigate("/"); return; }
    setDonorName(name);
    fetchHistory();
    fetchCertificates();

    const socket = io(API_BASE);
    socket.emit("join", `donor_${donorId}`);

    socket.on("new_sos", (data) => {
      new Audio("/alert.mp3").play().catch(() => {});
      setMessages((prev) => {
        if (prev.some((m) => m.request_id === data.request_id)) return prev;
        return [...prev, data];
      });
    });

    socket.on("remove_sos", (data) => {
      setMessages((prev) => prev.filter((m) => m.request_id !== data.request_id));
    });

    return () => socket.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab === "history") fetchHistory();
    if (activeTab === "certificates") fetchCertificates();
  }, [activeTab, fetchHistory, fetchCertificates]);

  const dismissMessage = (request_id) => {
    setMessages((prev) => prev.filter((m) => m.request_id !== request_id));
    fetchHistory();
    fetchCertificates();
  };

  return (
    <div className="dash-page">

      {/* CERTIFICATE PREVIEW MODAL */}
      {previewCert && (
        <CertificatePreview cert={previewCert} onClose={() => setPreviewCert(null)} />
      )}

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="dash-header">
        <div className="dash-header-left">
          <h2>🩸 Donor Dashboard</h2>
          <p>Welcome, {donorName || "Donor"}</p>
        </div>
        <div className="dash-header-right">
          {messages.length > 0 && (
            <div className="dash-badge">🔔 {messages.length}</div>
          )}
          {certificates.length > 0 && (
            <div className="dash-badge" style={{ background: "#f39c12", color: "#fff" }}>
              🏅 {certificates.length}
            </div>
          )}
          <button className="dash-logout-btn" onClick={logout}>Logout</button>
        </div>
      </div>

      {/* ── TABS ────────────────────────────────────────────────────────── */}
      <div className="dash-tabs">
        <button
          className={`dash-tab ${activeTab === "live" ? "dash-tab-active" : ""}`}
          onClick={() => setActiveTab("live")}
        >
          🚨 Live SOS
          {messages.length > 0 && <span className="dash-tab-badge">{messages.length}</span>}
        </button>
        <button
          className={`dash-tab ${activeTab === "history" ? "dash-tab-active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          📋 History
        </button>
        <button
          className={`dash-tab ${activeTab === "certificates" ? "dash-tab-active" : ""}`}
          onClick={() => setActiveTab("certificates")}
        >
          🏅 Certificates
          {certificates.length > 0 && (
            <span className="dash-tab-badge" style={{ background: "#f39c12" }}>
              {certificates.length}
            </span>
          )}
        </button>
      </div>

      {/* ── LIVE SOS TAB ────────────────────────────────────────────────── */}
      {activeTab === "live" && (
        <div>
          {messages.length === 0 ? (
            <div className="dash-empty">
              <div className="dash-empty-icon">📭</div>
              <p>No active SOS requests</p>
            </div>
          ) : (
            messages.map((msg) => (
              <Notification
                key={msg.request_id}
                data={msg}
                onDismiss={() => dismissMessage(msg.request_id)}
              />
            ))
          )}
        </div>
      )}

      {/* ── HISTORY TAB ─────────────────────────────────────────────────── */}
      {activeTab === "history" && (
        <div>
          {historyLoading ? (
            <div className="dash-empty"><p>Loading history...</p></div>
          ) : history.length === 0 ? (
            <div className="dash-empty">
              <div className="dash-empty-icon">📭</div>
              <p>No SOS history yet</p>
            </div>
          ) : (
            history.map((item) => {
              const cfg = RESPONSE_CONFIG[item.response_status] || RESPONSE_CONFIG.NOT_RESPONDED;
              return (
                <div key={item.request_id} className="dash-history-card"
                  style={{ borderLeft: `4px solid ${cfg.color}` }}>
                  <div className="dash-status-header">
                    <div className="dash-status-left">
                      <span className="dash-blood-badge">🩸 {item.blood_group}</span>
                      <span className="dash-status-chip" style={{ background: cfg.bg, color: cfg.color }}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </div>
                    <span className="dash-time">
                      {new Date(item.created_at).toLocaleDateString()}{" "}
                      {new Date(item.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="dash-hospital-name">🏥 {item.hospital_name}</p>
                  {item.hospital_address && (
                    <p className="dash-hospital-addr">📍 {item.hospital_address}</p>
                  )}
                  {item.response_time && (
                    <p className="dash-response-time">
                      Responded: {new Date(item.response_time).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── CERTIFICATES TAB ────────────────────────────────────────────── */}
      {activeTab === "certificates" && (
        <div>
          {certsLoading ? (
            <div className="dash-empty"><p>Loading certificates...</p></div>
          ) : certificates.length === 0 ? (
            <div className="dash-empty">
              <div className="dash-empty-icon">🏅</div>
              <p>No certificates yet</p>
              <p style={{ fontSize: "12px", color: "#bbb", marginTop: "6px" }}>
                Certificates are issued by hospitals after you donate blood
              </p>
            </div>
          ) : (
            certificates.map((cert) => (
              <div key={cert.certificate_id} style={certCard}>
                <div style={certAccentBar} />
                <div style={certBody}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <span style={certBadgeStyle}>🏅 Certificate</span>
                      <span style={certBloodBadge}>🩸 {cert.blood_group}</span>
                    </div>
                    <p style={certHospital}>🏥 {cert.hospital_name}</p>
                    {cert.hospital_address && (
                      <p style={certAddr}>📍 {cert.hospital_address}</p>
                    )}
                    <p style={certDate}>
                      Issued: {new Date(cert.issued_at).toLocaleDateString("en-IN", {
                        day: "numeric", month: "long", year: "numeric",
                      })}
                    </p>
                    <p style={certTokenStyle}>
                      ID: {cert.certificate_token?.slice(0, 18)}...
                    </p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <button style={viewBtn} onClick={() => setPreviewCert(cert)}>
                      👁 View
                    </button>
                    <button style={saveBtn} onClick={() => setPreviewCert(cert)}>
                      ⬇ Save
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const certCard       = { background: "#fff", border: "1px solid #e8e8e8", borderRadius: "12px", marginBottom: "12px", overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" };
const certAccentBar  = { height: "5px", background: "linear-gradient(90deg, #f39c12, #e67e22, #f39c12)" };
const certBody       = { padding: "14px 16px", display: "flex", gap: "12px", alignItems: "flex-start" };
const certBadgeStyle = { background: "#fef9e7", color: "#e67e22", border: "1px solid #f9ca8e", borderRadius: "20px", padding: "3px 10px", fontSize: "12px", fontWeight: 600 };
const certBloodBadge = { background: "#fadbd8", color: "#c0392b", borderRadius: "20px", padding: "3px 10px", fontSize: "12px", fontWeight: 600 };
const certHospital   = { margin: 0, fontSize: "14px", fontWeight: 600, color: "#2c3e50" };
const certAddr       = { margin: "3px 0 0", fontSize: "12px", color: "#888" };
const certDate       = { margin: "4px 0 0", fontSize: "12px", color: "#666" };
const certTokenStyle = { margin: "3px 0 0", fontSize: "10px", color: "#bbb", fontFamily: "monospace" };
const viewBtn        = { padding: "7px 14px", background: "#2c3e50", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: 600 };
const saveBtn        = { padding: "7px 14px", background: "linear-gradient(135deg,#f39c12,#e67e22)", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: 600 };