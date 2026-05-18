import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import LocationPicker from "../components/LocationPicker";
import CertificatePreview from "../components/CertificatePreview";
import API_BASE from "../config";
import "./Dashboard.css";
import "./HospitalMenu.css";

const STATUS_CONFIG = {
  ACCEPTED: { color: "#27ae60", bg: "#eafaf1", icon: "✅", label: "Donor Accepted" },
  REJECTED: { color: "#e67e22", bg: "#fef9e7", icon: "↩️", label: "Donor Declined" },
  TIMEOUT:  { color: "#7f8c8d", bg: "#f2f3f4", icon: "⏱",  label: "No Response"    },
  FAILED:   { color: "#e74c3c", bg: "#fdedec", icon: "❌", label: "SOS Failed"      },
  SENT:     { color: "#3498db", bg: "#eaf4fb", icon: "📡", label: "SOS Sent"        },
};

const OUTCOME_CONFIG = {
  ACCEPTED: { color: "#27ae60", bg: "#eafaf1", label: "✅ Fulfilled" },
  FAILED:   { color: "#e74c3c", bg: "#fdedec", label: "❌ Failed"    },
  PENDING:  { color: "#3498db", bg: "#eaf4fb", label: "⏳ Pending"   },
};

export default function HospitalDashboard() {
  const [hospitalName, setHospitalName]     = useState("");
  const [hospitalId, setHospitalId]         = useState(null);
  const [blood, setBlood]                   = useState("A+");
  const [loading, setLoading]               = useState(false);
  const [loggingOut, setLoggingOut]         = useState(false);
  const [activeRequests, setActiveRequests] = useState([]);
  const [history, setHistory]               = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [activeTab, setActiveTab]           = useState("sos");

  // Certificate state
  const [recentDonors, setRecentDonors]         = useState([]);
  const [recentDonorsLoading, setRecentDonorsLoading] = useState(false);
  const [previewCert, setPreviewCert]           = useState(null);
  const [generatingFor, setGeneratingFor]       = useState(null);

  // Menu state
  const [menuOpen, setMenuOpen]       = useState(false);
  const [menuSection, setMenuSection] = useState(null);

  // Settings state
  const [profile, setProfile]                   = useState(null);
  const [settingsTab, setSettingsTab]           = useState("password");
  const [currentPwd, setCurrentPwd]             = useState("");
  const [newPwd, setNewPwd]                     = useState("");
  const [confirmPwd, setConfirmPwd]             = useState("");
  const [settingsMsg, setSettingsMsg]           = useState(null);
  const [settingsLat, setSettingsLat]           = useState("");
  const [settingsLon, setSettingsLon]           = useState("");
  const [settingsAddress, setSettingsAddress]   = useState("");
  const [settingsLocality, setSettingsLocality] = useState("");
  const [settingsSaving, setSettingsSaving]     = useState(false);
  const [donorDetails, setDonorDetails]         = useState([]);
  const [donorsLoading, setDonorsLoading]       = useState(false);

  const socketRef = useRef(null);
  const nav = useNavigate();
  const token = () => localStorage.getItem("token");

  // ── FETCH FUNCTIONS ───────────────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const res = await fetch(`${API_BASE}/requests/history`, {
        headers: { "Authorization": token() },
      });
      const data = await res.json();
      if (res.ok) setHistory(data);
    } catch (err) { console.error("History error:", err); }
    finally { setHistoryLoading(false); }
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/hospital-profile`, {
        headers: { "Authorization": token() },
      });
      const data = await res.json();
      if (res.ok) setProfile(data);
    } catch (err) { console.error("Profile error:", err); }
  }, []);

  const fetchRecentDonors = useCallback(async () => {
    try {
      setRecentDonorsLoading(true);
      const res = await fetch(`${API_BASE}/certificates/recent-donors`, {
        headers: { "Authorization": token() },
      });
      const data = await res.json();
      if (res.ok) setRecentDonors(data);
    } catch (err) { console.error("Recent donors error:", err); }
    finally { setRecentDonorsLoading(false); }
  }, []);

  const fetchDonorDetails = useCallback(async () => {
    try {
      setDonorsLoading(true);
      const res = await fetch(`${API_BASE}/requests/history`, {
        headers: { "Authorization": token() },
      });
      const data = await res.json();
      if (res.ok) {
        const all = [];
        data.forEach((req) => {
          req.responses.forEach((r) => {
            all.push({
              ...r,
              blood_group: req.blood_group,
              request_id:  req.request_id,
              created_at:  req.created_at,
            });
          });
        });
        setDonorDetails(all);
      }
    } catch (err) { console.error("Donors error:", err); }
    finally { setDonorsLoading(false); }
  }, []);

  // ── INIT ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const id   = localStorage.getItem("hospital_id");
    const tk   = localStorage.getItem("token");
    const name = localStorage.getItem("hospital_name");
    if (!id || !tk) { nav("/hospital-login"); return; }
    setHospitalName(name || "Hospital");
    setHospitalId(id);
    fetchHistory();
    fetchProfile();
    fetchRecentDonors();

    const socket = io(API_BASE);
    socketRef.current = socket;
    socket.emit("join", `hospital_${id}`);

    socket.on("sos_update", (data) => {
      setActiveRequests((prev) =>
        prev.map((req) => {
          if (req.request_id !== data.request_id) return req;
          return {
            ...req,
            log: [...req.log, { type: data.type, message: data.message, timestamp: data.timestamp }],
            resolved:  data.type === "ACCEPTED" || data.type === "FAILED",
            finalType: data.type === "ACCEPTED" || data.type === "FAILED" ? data.type : req.finalType,
          };
        })
      );
      if (data.type === "ACCEPTED" || data.type === "FAILED") {
        fetchHistory();
        fetchRecentDonors();
      }
    });

    return () => socket.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab === "history") fetchHistory();
  }, [activeTab, fetchHistory]);

  useEffect(() => {
    if (menuSection === "history") fetchHistory();
    if (menuSection === "donors") fetchDonorDetails();
    if (menuSection === "about" || menuSection === "settings") fetchProfile();
  }, [menuSection]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── GENERATE CERTIFICATE ──────────────────────────────────────────────────
  const generateCertificate = async (donor) => {
    try {
      setGeneratingFor(donor.donor_id);
      const res = await fetch(`${API_BASE}/certificates/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": token() },
        body: JSON.stringify({ donor_id: donor.donor_id, request_id: donor.request_id }),
      });
      const data = await res.json();
      if (res.ok) {
        setPreviewCert(data.certificate);
        fetchRecentDonors();
      } else {
        alert(data.message || "Failed to generate certificate");
      }
    } catch { alert("Server error. Please try again."); }
    finally { setGeneratingFor(null); }
  };

  const viewExistingCert = async (donor) => {
    try {
      const res = await fetch(`${API_BASE}/certificates/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": token() },
        body: JSON.stringify({ donor_id: donor.donor_id, request_id: donor.request_id }),
      });
      const data = await res.json();
      if (res.ok) setPreviewCert(data.certificate);
    } catch { alert("Server error."); }
  };

  // ── LOGOUT ────────────────────────────────────────────────────────────────
  const logout = async () => {
    setLoggingOut(true);
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST", headers: { "Authorization": token() },
      });
    } catch {}
    localStorage.removeItem("hospital_id");
    localStorage.removeItem("hospital_name");
    localStorage.removeItem("token");
    socketRef.current?.disconnect();
    nav("/");
  };

  // ── SEND SOS ──────────────────────────────────────────────────────────────
  const sendSOS = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/requests/sos`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": token() },
        body: JSON.stringify({ hospital_id: Number(hospitalId), blood_group: blood }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) { nav("/hospital-login"); return; }
        alert(data.error || "Failed to send SOS"); return;
      }
      const newReq = {
        request_id:   data.request?.request_id,
        blood_group:  blood,
        donors_found: data.nearby_donors?.length || 0,
        sent_at:      new Date().toISOString(),
        resolved:     data.nearby_donors?.length === 0,
        finalType:    data.nearby_donors?.length === 0 ? "FAILED" : null,
        log: [{
          type:      data.nearby_donors?.length > 0 ? "SENT" : "FAILED",
          message:   data.nearby_donors?.length > 0
            ? `SOS sent. ${data.nearby_donors.length} donor(s) found. Notifying nearest donor...`
            : "SOS created but no matching donors found.",
          timestamp: new Date().toISOString(),
        }],
      };
      setActiveRequests((prev) => [newReq, ...prev]);
      setActiveTab("sos");
    } catch { alert("Server error."); }
    finally { setLoading(false); }
  };

  // ── SETTINGS ─────────────────────────────────────────────────────────────
  const updatePassword = async () => {
    setSettingsMsg(null);
    if (!currentPwd || !newPwd || !confirmPwd) { setSettingsMsg({ type: "error", text: "All fields required" }); return; }
    if (newPwd !== confirmPwd) { setSettingsMsg({ type: "error", text: "Passwords do not match" }); return; }
    if (newPwd.length < 6) { setSettingsMsg({ type: "error", text: "Minimum 6 characters" }); return; }
    try {
      setSettingsSaving(true);
      const res = await fetch(`${API_BASE}/auth/hospital-password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": token() },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (res.ok) { setSettingsMsg({ type: "success", text: "Password updated!" }); setCurrentPwd(""); setNewPwd(""); setConfirmPwd(""); }
      else setSettingsMsg({ type: "error", text: data.message || "Failed" });
    } catch { setSettingsMsg({ type: "error", text: "Server error" }); }
    finally { setSettingsSaving(false); }
  };

  const updateLocation = async () => {
    setSettingsMsg(null);
    if (!settingsLat || !settingsLon) { setSettingsMsg({ type: "error", text: "Select location on map" }); return; }
    try {
      setSettingsSaving(true);
      const res = await fetch(`${API_BASE}/auth/hospital-location`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": token() },
        body: JSON.stringify({ lat: settingsLat, lon: settingsLon, address: settingsAddress, locality: settingsLocality }),
      });
      const data = await res.json();
      if (res.ok) { setSettingsMsg({ type: "success", text: "Location updated!" }); fetchProfile(); }
      else setSettingsMsg({ type: "error", text: data.message || "Failed" });
    } catch { setSettingsMsg({ type: "error", text: "Server error" }); }
    finally { setSettingsSaving(false); }
  };

  const openMenu  = (section) => { setMenuSection(section); setMenuOpen(true); setSettingsMsg(null); };
  const closeMenu = () => { setMenuOpen(false); setMenuSection(null); };
  const pendingCount = activeRequests.filter(r => !r.resolved).length;

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="dash-page">

      {previewCert && <CertificatePreview cert={previewCert} onClose={() => setPreviewCert(null)} />}

      {/* HEADER */}
      <div className="dash-header dash-header-hospital">
        <div className="dash-header-left">
          <h2>🏥 Hospital Dashboard</h2>
          <p>Welcome, {hospitalName}</p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button className="dash-logout-btn" onClick={() => setMenuOpen(!menuOpen)}>☰ Menu</button>
          <button className="dash-logout-btn" onClick={logout} disabled={loggingOut}>
            {loggingOut ? "..." : "Logout"}
          </button>
        </div>
      </div>

      {/* MENU OVERLAY */}
      {menuOpen && (
        <div className="menu-overlay" onClick={closeMenu}>
          <div className="menu-panel" onClick={(e) => e.stopPropagation()}>
            <div className="menu-header">
              <span>🏥 {hospitalName}</span>
              <button className="menu-close" onClick={closeMenu}>✕</button>
            </div>

            {!menuSection ? (
              <div className="menu-items">
                {[
                  { id: "history",  icon: "📋", title: "SOS History",     sub: "All past emergency requests" },
                  { id: "donors",   icon: "🩸", title: "Donor Responses", sub: "Accepted, rejected, no response" },
                  { id: "about",    icon: "🏷️", title: "About Hospital",  sub: "Your hospital profile" },
                  { id: "settings", icon: "⚙️", title: "Settings",        sub: "Password and location" },
                ].map((item) => (
                  <div key={item.id} className="menu-item" onClick={() => openMenu(item.id)}>
                    <span className="menu-icon">{item.icon}</span>
                    <div>
                      <p className="menu-item-title">{item.title}</p>
                      <p className="menu-item-sub">{item.sub}</p>
                    </div>
                    <span className="menu-arrow">›</span>
                  </div>
                ))}
              </div>
            ) : (
              <button className="menu-back" onClick={() => { setMenuSection(null); setSettingsMsg(null); }}>‹ Back</button>
            )}

            {/* HISTORY */}
            {menuSection === "history" && (
              <div className="menu-content">
                <h3 className="menu-section-title">📋 SOS History</h3>
                {historyLoading ? <p className="menu-empty">Loading...</p> :
                  history.length === 0 ? <p className="menu-empty">No history yet</p> :
                  history.map((item) => {
                    const outCfg = OUTCOME_CONFIG[item.outcome] || OUTCOME_CONFIG.PENDING;
                    return (
                      <div key={item.request_id} className="menu-card" style={{ borderLeft: `4px solid ${outCfg.color}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span className="dash-blood-badge">🩸 {item.blood_group}</span>
                          <span style={{ fontSize: "11px", color: "#aaa" }}>
                            {new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <span className="dash-outcome-badge" style={{ background: outCfg.bg, color: outCfg.color, display: "inline-block", marginTop: "6px" }}>
                          {outCfg.label}
                        </span>
                        <p style={{ fontSize: "12px", color: "#888", margin: "4px 0 0" }}>{item.donors_found} donor(s) notified</p>
                      </div>
                    );
                  })
                }
              </div>
            )}

            {/* DONOR RESPONSES */}
            {menuSection === "donors" && (
              <div className="menu-content">
                <h3 className="menu-section-title">🩸 Donor Responses</h3>
                {donorsLoading ? <p className="menu-empty">Loading...</p> :
                  donorDetails.length === 0 ? <p className="menu-empty">No responses yet</p> :
                  donorDetails.map((r, i) => {
                    const cfg = STATUS_CONFIG[r.response_status] || STATUS_CONFIG.SENT;
                    return (
                      <div key={i} className="menu-card" style={{ background: cfg.bg, display: "flex", gap: "12px", alignItems: "center" }}>
                        <span style={{ fontSize: "20px" }}>{cfg.icon}</span>
                        <div>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: "14px" }}>{r.donor_name}</p>
                          <p style={{ margin: "2px 0 0", fontSize: "12px", color: cfg.color, fontWeight: 600 }}>{cfg.label}</p>
                          <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#888" }}>
                            🩸 {r.blood_group} · {new Date(r.response_time).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            )}

            {/* ABOUT */}
            {menuSection === "about" && (
              <div className="menu-content">
                <h3 className="menu-section-title">🏷️ About Hospital</h3>
                {!profile ? <p className="menu-empty">Loading...</p> : (
                  <div className="menu-card">
                    {[
                      ["Name",     profile.name],
                      ["Email",    profile.email],
                      ["Phone",    profile.phone    || "—"],
                      ["Address",  profile.address  || "—"],
                      ["Locality", profile.locality || "—"],
                      ["Location", profile.lat ? `${Number(profile.lat).toFixed(4)}, ${Number(profile.lon).toFixed(4)}` : "Not set"],
                    ].map(([label, value]) => (
                      <div key={label} className="about-row">
                        <span className="about-label">{label}</span>
                        <span style={{ fontSize: "13px", color: "#333", textAlign: "right" }}>{value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SETTINGS */}
            {menuSection === "settings" && (
              <div className="menu-content">
                <h3 className="menu-section-title">⚙️ Settings</h3>
                <div className="settings-tabs">
                  {["password", "location"].map((tab) => (
                    <button key={tab}
                      className={`settings-tab ${settingsTab === tab ? "settings-tab-active" : ""}`}
                      onClick={() => { setSettingsTab(tab); setSettingsMsg(null); }}>
                      {tab === "password" ? "🔑 Password" : "📍 Location"}
                    </button>
                  ))}
                </div>
                {settingsMsg && <div className={`settings-msg ${settingsMsg.type}`}>{settingsMsg.text}</div>}

                {settingsTab === "password" && (
                  <div>
                    {[
                      ["Current Password", currentPwd, setCurrentPwd, "Enter current password"],
                      ["New Password",     newPwd,     setNewPwd,     "Min 6 characters"],
                      ["Confirm Password", confirmPwd, setConfirmPwd, "Re-enter new password"],
                    ].map(([label, val, setter, ph]) => (
                      <div key={label}>
                        <label className="settings-label">{label}</label>
                        <input className="settings-input" type="password" placeholder={ph}
                          value={val} onChange={(e) => setter(e.target.value)} />
                      </div>
                    ))}
                    <button className="settings-save-btn" onClick={updatePassword} disabled={settingsSaving}>
                      {settingsSaving ? "Saving..." : "Update Password"}
                    </button>
                  </div>
                )}

                {settingsTab === "location" && (
                  <div>
                    {profile && (
                      <p className="settings-current-loc">
                        📍 Current: {profile.lat ? `${Number(profile.lat).toFixed(4)}, ${Number(profile.lon).toFixed(4)}` : "Not set"}
                      </p>
                    )}
                    <label className="settings-label">New Address</label>
                    <input className="settings-input" placeholder="Street, building" value={settingsAddress} onChange={(e) => setSettingsAddress(e.target.value)} />
                    <label className="settings-label">Locality / City</label>
                    <input className="settings-input" placeholder="e.g. Pune" value={settingsLocality} onChange={(e) => setSettingsLocality(e.target.value)} />
                    <label className="settings-label">Select on Map</label>
                    <div style={{ borderRadius: "10px", overflow: "hidden", marginTop: "6px" }}>
                      <LocationPicker setLat={setSettingsLat} setLon={setSettingsLon} />
                    </div>
                    {settingsLat && settingsLon && (
                      <p style={{ fontSize: "12px", color: "#27ae60", margin: "6px 0" }}>
                        ✅ {Number(settingsLat).toFixed(4)}, {Number(settingsLon).toFixed(4)}
                      </p>
                    )}
                    <button className="settings-save-btn" onClick={updateLocation} disabled={settingsSaving}>
                      {settingsSaving ? "Saving..." : "Update Location"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SOS FORM */}
      <div className="dash-card">
        <h3 className="dash-card-title">🚨 Create Emergency SOS</h3>
        <p className="dash-location-note">📍 Your registered hospital location will be used automatically</p>
        <label className="dash-label">Blood Group Required</label>
        <select className="dash-select" onChange={(e) => setBlood(e.target.value)} value={blood}>
          {["A+","A-","B+","B-","O+","O-","AB+","AB-"].map((g) => <option key={g}>{g}</option>)}
        </select>
        <button className="dash-sos-btn" onClick={sendSOS} disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
          {loading ? "Sending..." : "🚨 Send SOS Alert"}
        </button>
      </div>

      {/* RECENT DONORS — CERTIFICATE SECTION */}
      {(recentDonors.length > 0 || recentDonorsLoading) && (
        <div className="dash-card">
          <h3 className="dash-card-title">🏅 Recent Donors — Issue Certificate</h3>
          {recentDonorsLoading ? (
            <p style={{ color: "#aaa", fontSize: "13px" }}>Loading...</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {recentDonors.map((donor) => (
                <div key={donor.donor_id} style={donorRowStyle}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: "14px", color: "#2c3e50" }}>{donor.donor_name}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#888" }}>
                      🩸 {donor.blood_group} · {new Date(donor.response_time).toLocaleDateString()}
                    </p>
                  </div>
                  {donor.certificate_token ? (
                    <button style={viewCertBtnStyle} onClick={() => viewExistingCert(donor)}>
                      👁 View Certificate
                    </button>
                  ) : (
                    <button
                      style={{ ...genCertBtnStyle, opacity: generatingFor === donor.donor_id ? 0.7 : 1 }}
                      disabled={generatingFor === donor.donor_id}
                      onClick={() => generateCertificate(donor)}
                    >
                      {generatingFor === donor.donor_id ? "Generating..." : "🏅 Generate"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TABS */}
      <div className="dash-tabs">
        <button className={`dash-tab ${activeTab === "sos" ? "dash-tab-active-hospital" : ""}`} onClick={() => setActiveTab("sos")}>
          📡 Live Status
          {pendingCount > 0 && <span className="dash-tab-badge">{pendingCount}</span>}
        </button>
        <button className={`dash-tab ${activeTab === "history" ? "dash-tab-active-hospital" : ""}`} onClick={() => setActiveTab("history")}>
          📋 SOS History
        </button>
      </div>

      {/* LIVE STATUS */}
      {activeTab === "sos" && (
        <div>
          {activeRequests.length === 0 ? (
            <div className="dash-empty"><div className="dash-empty-icon">📭</div><p>No active SOS requests</p></div>
          ) : (
            activeRequests.map((req) => {
              const bc = req.finalType === "ACCEPTED" ? "#27ae60" : req.finalType === "FAILED" ? "#e74c3c" : "#3498db";
              return (
                <div key={req.request_id} className="dash-status-card" style={{ borderLeft: `4px solid ${bc}` }}>
                  <div className="dash-status-header">
                    <div className="dash-status-left">
                      <span className="dash-blood-badge">🩸 {req.blood_group}</span>
                      <span className="dash-donor-count">{req.donors_found} donor(s) found</span>
                    </div>
                    <span className="dash-time">{new Date(req.sent_at).toLocaleTimeString()}</span>
                  </div>
                  {req.resolved && (
                    <div className="dash-resolved-banner" style={{
                      background: req.finalType === "ACCEPTED" ? "#eafaf1" : "#fdedec",
                      color: req.finalType === "ACCEPTED" ? "#27ae60" : "#e74c3c",
                    }}>
                      {req.finalType === "ACCEPTED" ? "✅ Request Fulfilled — Donor is on the way" : "❌ Request Failed — No donors responded"}
                    </div>
                  )}
                  <div className="dash-timeline">
                    {req.log.map((entry, i) => {
                      const cfg = STATUS_CONFIG[entry.type] || STATUS_CONFIG.SENT;
                      return (
                        <div key={i} className="dash-timeline-row">
                          <div className="dash-timeline-dot" style={{ background: cfg.color }}>{cfg.icon}</div>
                          <div className="dash-timeline-content">
                            <span className="dash-timeline-label" style={{ color: cfg.color }}>{cfg.label}</span>
                            <p className="dash-timeline-msg">{entry.message}</p>
                            <span className="dash-timeline-time">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      );
                    })}
                    {!req.resolved && (
                      <div className="dash-timeline-row">
                        <div className="dash-timeline-dot" style={{ background: "#bdc3c7" }}>⏳</div>
                        <span className="dash-timeline-time" style={{ alignSelf: "center" }}>Waiting for donor response...</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* HISTORY */}
      {activeTab === "history" && (
        <div>
          {historyLoading ? (
            <div className="dash-empty"><p>Loading...</p></div>
          ) : history.length === 0 ? (
            <div className="dash-empty"><div className="dash-empty-icon">📭</div><p>No SOS history yet</p></div>
          ) : (
            history.map((item) => {
              const outCfg = OUTCOME_CONFIG[item.outcome] || OUTCOME_CONFIG.PENDING;
              return (
                <div key={item.request_id} className="dash-history-card" style={{ borderLeft: `4px solid ${outCfg.color}` }}>
                  <div className="dash-status-header">
                    <div className="dash-status-left">
                      <span className="dash-blood-badge">🩸 {item.blood_group}</span>
                      <span className="dash-outcome-badge" style={{ background: outCfg.bg, color: outCfg.color }}>{outCfg.label}</span>
                    </div>
                    <span className="dash-time">
                      {new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  {item.responses.length === 0 ? (
                    <p style={{ fontSize: "13px", color: "#aaa", margin: "8px 0 0" }}>No donors responded</p>
                  ) : (
                    <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
                      {item.responses.map((r, j) => {
                        const cfg = STATUS_CONFIG[r.response_status] || STATUS_CONFIG.SENT;
                        return (
                          <div key={j} className="dash-response-row" style={{ background: cfg.bg }}>
                            <span className="dash-response-icon">{cfg.icon}</span>
                            <div style={{ flex: 1 }}>
                              <span className="dash-response-name">{r.donor_name}</span>
                              <span className="dash-response-status" style={{ color: cfg.color }}>{cfg.label}</span>
                            </div>
                            <span className="dash-response-time-sm">{new Date(r.response_time).toLocaleTimeString()}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

const donorRowStyle    = { display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", background: "#f8f9fa", borderRadius: "10px", border: "1px solid #eee" };
const genCertBtnStyle  = { padding: "8px 14px", background: "linear-gradient(135deg,#f39c12,#e67e22)", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(243,156,18,0.3)" };
const viewCertBtnStyle = { padding: "8px 14px", background: "linear-gradient(135deg,#2c3e50,#1a252f)", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap" };