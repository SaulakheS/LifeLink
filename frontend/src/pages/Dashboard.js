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
      await fetch(`${API_BASE}/auth/logout`, { method: "POST", headers: { "Authorization": token } });
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
      setHistory([]);
      const res = await fetch(`${API_BASE}/donors/history`, { headers: { "Authorization": token } });
      const data = await res.json();
      if (res.ok) setHistory(Array.isArray(data) ? data : []);
      else setHistory([]);
    } catch (err) {
      console.error("History error:", err);
      setHistory([]);
    } finally { setHistoryLoading(false); }
  }, []);

  const fetchCertificates = useCallback(async () => {
    const token = localStorage.getItem("token");
    try {
      setCertsLoading(true);
      const res = await fetch(`${API_BASE}/certificates/my`, { headers: { "Authorization": token } });
      const data = await res.json();
      if (res.ok) setCertificates(data);
    } catch (err) { console.error("Certificates error:", err); }
    finally { setCertsLoading(false); }
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
      setMessages((prev) => prev.some((m) => m.request_id === data.request_id) ? prev : [...prev, data]);
    });
    socket.on("remove_sos", (data) => {
      setMessages((prev) => prev.filter((m) => m.request_id !== data.request_id));
    });
    return () => socket.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab === "history")      fetchHistory();
    if (activeTab === "certificates") fetchCertificates();
  }, [activeTab, fetchHistory, fetchCertificates]);

  const dismissMessage = (request_id) => {
    setMessages((prev) => prev.filter((m) => m.request_id !== request_id));
    fetchHistory();
    fetchCertificates();
  };

  return (
    <div className="dash-page">

      {previewCert && <CertificatePreview cert={previewCert} onClose={() => setPreviewCert(null)} />}

      {/* HEADER */}
      <div className="dash-header">
        <div className="dash-header-left">
          <h2>🩸 Donor Dashboard</h2>
          <p>Welcome, {donorName || "Donor"}</p>
        </div>
        <div className="dash-header-right">
          {messages.length > 0 && <div className="dash-badge">🔔 {messages.length}</div>}
          {certificates.length > 0 && <div className="dash-badge-gold">🏅 {certificates.length}</div>}
          <button className="dash-logout-btn" onClick={logout}>Logout</button>
        </div>
      </div>

      {/* TABS */}
      <div className="dash-tabs">
        <button className={`dash-tab ${activeTab === "live" ? "dash-tab-active" : ""}`} onClick={() => setActiveTab("live")}>
          🚨 Live SOS
          {messages.length > 0 && <span className="dash-tab-badge">{messages.length}</span>}
        </button>
        <button className={`dash-tab ${activeTab === "history" ? "dash-tab-active" : ""}`} onClick={() => setActiveTab("history")}>
          📋 History
        </button>
        <button className={`dash-tab ${activeTab === "certificates" ? "dash-tab-active" : ""}`} onClick={() => setActiveTab("certificates")}>
          🏅 Certificates
          {certificates.length > 0 && <span className="dash-tab-badge">{certificates.length}</span>}
        </button>
      </div>

      {/* LIVE SOS */}
      {activeTab === "live" && (
        <div>
          {messages.length === 0 ? (
            <div className="dash-empty"><div className="dash-empty-icon">📭</div><p>No active SOS requests</p></div>
          ) : (
            messages.map((msg) => (
              <Notification key={msg.request_id} data={msg} onDismiss={() => dismissMessage(msg.request_id)} />
            ))
          )}
        </div>
      )}

      {/* HISTORY */}
      {activeTab === "history" && (
        <div>
          {historyLoading ? (
            <div className="dash-empty"><p>Loading history...</p></div>
          ) : history.length === 0 ? (
            <div className="dash-empty"><div className="dash-empty-icon">📭</div><p>No SOS history yet</p></div>
          ) : (
            history.map((item) => {
              const cfg = RESPONSE_CONFIG[item.response_status] || RESPONSE_CONFIG.NOT_RESPONDED;
              return (
                <div key={item.request_id} className="dash-history-card" style={{ borderLeft: `4px solid ${cfg.color}` }}>
                  <div className="dash-status-header">
                    <div className="dash-status-left">
                      <span className="dash-blood-badge">🩸 {item.blood_group}</span>
                      <span className="dash-status-chip" style={{ background: cfg.bg, color: cfg.color }}>{cfg.icon} {cfg.label}</span>
                    </div>
                    <span className="dash-time">{new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString()}</span>
                  </div>
                  <p className="dash-hospital-name">🏥 {item.hospital_name}</p>
                  {item.hospital_address && <p className="dash-hospital-addr">📍 {item.hospital_address}</p>}
                  {item.response_time && <p className="dash-response-time">Responded: {new Date(item.response_time).toLocaleTimeString()}</p>}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* CERTIFICATES */}
      {activeTab === "certificates" && (
        <div>
          {certsLoading ? (
            <div className="dash-empty"><p>Loading certificates...</p></div>
          ) : certificates.length === 0 ? (
            <div className="dash-empty">
              <div className="dash-empty-icon">🏅</div>
              <p>No certificates yet</p>
              <p style={{ fontSize: "12px", color: "#bbb", marginTop: "6px" }}>Issued by hospitals after you donate</p>
            </div>
          ) : (
            certificates.map((cert) => (
              <div key={cert.certificate_id} className="cert-card">
                <div className="cert-card-accent" />
                <div className="cert-card-body">
                  <div className="cert-card-info">
                    <div className="cert-badge-row">
                      <span className="cert-badge">🏅 Certificate</span>
                      <span className="cert-blood-badge">🩸 {cert.blood_group}</span>
                    </div>
                    <p className="cert-hospital">🏥 {cert.hospital_name}</p>
                    {cert.hospital_address && <p className="cert-addr">📍 {cert.hospital_address}</p>}
                    <p className="cert-date">Issued: {new Date(cert.issued_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
                    <p className="cert-token">ID: {cert.certificate_token?.slice(0, 18)}...</p>
                  </div>
                  <div className="cert-card-actions">
                    <button className="btn-cert-view" onClick={() => setPreviewCert(cert)}>👁 View</button>
                    <button className="btn-cert-save" onClick={() => setPreviewCert(cert)}>⬇ Save</button>
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