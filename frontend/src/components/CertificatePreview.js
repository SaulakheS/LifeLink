import { useRef } from "react";
import "../pages/Dashboard.css";

const BLOOD_COLORS = {
  "A+": "#e74c3c", "A-": "#c0392b",
  "B+": "#e67e22", "B-": "#d35400",
  "O+": "#27ae60", "O-": "#1e8449",
  "AB+": "#8e44ad", "AB-": "#6c3483",
};

export default function CertificatePreview({ cert, onClose }) {
  const certRef = useRef(null);

  const handleDownload = () => {
    const content = certRef.current.innerHTML;
    const style = `
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;600&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'DM Sans', sans-serif; background: #f5f5f5; display:flex; align-items:center; justify-content:center; min-height:100vh; }
    `;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Certificate - ${cert.donor_name}</title><style>${style}</style></head><body>${content}</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `LifeLink_Certificate_${cert.donor_name.replace(/\s+/g, "_")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const bloodColor = BLOOD_COLORS[cert.blood_group] || "#c0392b";
  const gradientBar = `linear-gradient(90deg, ${bloodColor}, #2c3e50, ${bloodColor})`;

  const issuedDate = new Date(cert.issued_at).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="cert-overlay">
      <div className="cert-modal">

        {/* Action bar */}
        <div className="cert-modal-bar">
          <h3>🏅 Certificate Preview</h3>
          <div className="cert-modal-actions">
            <button className="btn-download" onClick={handleDownload}>⬇ Download</button>
            <button className="btn-close-modal" onClick={onClose}>✕ Close</button>
          </div>
        </div>

        {/* Certificate scroll area */}
        <div className="cert-scroll-area">
          <div ref={certRef}>
            <div className="cert-doc-outer">
              <div className="cert-doc-inner">

                {/* Top accent bar */}
                <div className="cert-top-bar" style={{ background: gradientBar }} />

                {/* Logo row */}
                <div className="cert-logo-row">
                  <span style={{ fontSize: "40px" }}>🩸</span>
                  <div>
                    <p className="cert-app-name" style={{ color: bloodColor }}>LifeLink</p>
                    <p className="cert-app-sub">Emergency Blood Donation Network</p>
                  </div>
                </div>

                {/* Title */}
                <div className="cert-title-section">
                  <h1 className="cert-doc-title">Certificate of Blood Donation</h1>
                  <p className="cert-doc-subtitle">This is to certify that</p>
                </div>

                {/* Donor name */}
                <div className="cert-name-box" style={{ background: `${bloodColor}12`, border: `2px solid ${bloodColor}30` }}>
                  <h2 className="cert-name-text">{cert.donor_name}</h2>
                </div>

                <p className="cert-body-text">has heroically donated blood of group</p>

                {/* Blood group badge */}
                <div className="cert-bg-badge" style={{ background: bloodColor }}>
                  <span className="cert-bg-badge-text">{cert.blood_group}</span>
                </div>

                <p className="cert-body-text">in response to an emergency SOS at</p>

                {/* Hospital */}
                <div className="cert-hosp-box">
                  <p className="cert-hosp-name">{cert.hospital_name}</p>
                  {cert.hospital_address && <p className="cert-hosp-addr">{cert.hospital_address}</p>}
                </div>

                <p className="cert-date-text">Date of Donation: <strong>{issuedDate}</strong></p>

                {/* Divider */}
                <div className="cert-divider" style={{ background: `linear-gradient(90deg, transparent, ${bloodColor}60, transparent)` }} />

                {/* Token + verified */}
                <div className="cert-token-row">
                  <div className="cert-verified-badge">
                    <span style={{ fontSize: "16px" }}>✅</span>
                    <span className="cert-verified-text">Verified by LifeLink</span>
                  </div>
                  <div className="cert-token-box">
                    <p className="cert-token-label">Certificate ID</p>
                    <p className="cert-token-value">{cert.certificate_token}</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="cert-footer">
                  <p className="cert-footer-text">🩸 Every drop counts. Thank you for saving a life.</p>
                  <p className="cert-footer-sub">Digitally issued by LifeLink Emergency Blood Donation Network</p>
                </div>

                {/* Bottom accent bar */}
                <div className="cert-bottom-bar" style={{ background: gradientBar }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}