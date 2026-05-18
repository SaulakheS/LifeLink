import { useRef } from "react";

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
  const issuedDate = new Date(cert.issued_at).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div style={overlay}>
      <div style={modal}>

        {/* Action Bar */}
        <div style={actionBar}>
          <h3 style={{ margin: 0, fontSize: "15px", color: "#2c3e50" }}>🏅 Certificate Preview</h3>
          <div style={{ display: "flex", gap: "10px" }}>
            <button data-download onClick={handleDownload} style={dlBtn}>⬇ Download</button>
            <button onClick={onClose} style={closeBtn}>✕ Close</button>
          </div>
        </div>

        {/* Scrollable certificate area */}
        <div style={scrollArea}>
          <div ref={certRef}>
            <div style={certOuter}>
              <div style={certInner}>

                <div style={topBar(bloodColor)} />

                {/* Header */}
                <div style={logoRow}>
                  <span style={{ fontSize: "40px" }}>🩸</span>
                  <div>
                    <p style={{ ...appName, color: bloodColor }}>LifeLink</p>
                    <p style={appSub}>Emergency Blood Donation Network</p>
                  </div>
                </div>

                {/* Title */}
                <div style={{ marginBottom: "24px" }}>
                  <h1 style={certTitle}>Certificate of Blood Donation</h1>
                  <p style={certSub}>This is to certify that</p>
                </div>

                {/* Donor Name */}
                <div style={nameBox(bloodColor)}>
                  <h2 style={nameText}>{cert.donor_name}</h2>
                </div>

                <p style={bodyTxt}>has heroically donated blood of group</p>

                {/* Blood Group */}
                <div style={bgBadge(bloodColor)}>
                  <span style={bgText}>{cert.blood_group}</span>
                </div>

                <p style={bodyTxt}>in response to an emergency SOS at</p>

                {/* Hospital */}
                <div style={hospBox}>
                  <p style={hospName}>{cert.hospital_name}</p>
                  {cert.hospital_address && (
                    <p style={hospAddr}>{cert.hospital_address}</p>
                  )}
                </div>

                <p style={dateTxt}>Date of Donation: <strong>{issuedDate}</strong></p>

                <div style={dividerLine(bloodColor)} />

                {/* Token + Verified */}
                <div style={tokenRow}>
                  <div style={verBadge}>
                    <span style={{ fontSize: "16px" }}>✅</span>
                    <span style={verTxt}>Verified by LifeLink</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={tokenLbl}>Certificate ID</p>
                    <p style={tokenVal}>{cert.certificate_token}</p>
                  </div>
                </div>

                {/* Footer */}
                <div style={{ marginTop: "20px", textAlign: "center" }}>
                  <p style={footerTxt}>🩸 Every drop counts. Thank you for saving a life.</p>
                  <p style={{ ...footerTxt, opacity: 0.5, marginTop: "4px" }}>
                    Digitally issued by LifeLink Emergency Blood Donation Network
                  </p>
                </div>

                <div style={bottomBar(bloodColor)} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const overlay    = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" };
const modal      = { background: "#fff", borderRadius: "16px", width: "100%", maxWidth: "580px", maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" };
const actionBar  = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid #eee", flexShrink: 0 };
const dlBtn      = { padding: "8px 18px", background: "#27ae60", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600 };
const closeBtn   = { padding: "8px 14px", background: "#f0f0f0", color: "#333", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px" };
const scrollArea = { overflowY: "auto", flex: 1, padding: "20px", background: "#f5f5f5" };
const certOuter  = { background: "#fff", borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.12)", overflow: "hidden" };
const certInner  = { padding: "0 40px 0", fontFamily: "'DM Sans',sans-serif", textAlign: "center" };
const topBar     = (c) => ({ height: "8px", background: `linear-gradient(90deg,${c},#2c3e50,${c})`, marginBottom: "30px" });
const bottomBar  = (c) => ({ height: "8px", background: `linear-gradient(90deg,${c},#2c3e50,${c})`, marginTop: "30px", marginLeft: "-40px", marginRight: "-40px" });
const logoRow    = { display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "24px" };
const appName    = { margin: 0, fontSize: "22px", fontFamily: "'Playfair Display',serif", fontWeight: 700 };
const appSub     = { margin: "2px 0 0", fontSize: "11px", color: "#888", letterSpacing: "0.5px" };
const certTitle  = { fontFamily: "'Playfair Display',serif", fontSize: "26px", fontWeight: 700, color: "#2c3e50", margin: "0 0 8px" };
const certSub    = { fontSize: "14px", color: "#888", margin: 0, textTransform: "uppercase", letterSpacing: "2px" };
const nameBox    = (c) => ({ background: `${c}12`, border: `2px solid ${c}30`, borderRadius: "10px", padding: "14px 24px", marginBottom: "16px" });
const nameText   = { fontFamily: "'Playfair Display',serif", fontSize: "28px", fontWeight: 700, color: "#2c3e50", margin: 0 };
const bodyTxt    = { fontSize: "15px", color: "#555", margin: "8px 0", lineHeight: 1.5 };
const bgBadge    = (c) => ({ display: "inline-block", background: c, borderRadius: "50px", padding: "8px 32px", margin: "8px 0" });
const bgText     = { fontSize: "24px", fontWeight: 700, color: "#fff", letterSpacing: "2px" };
const hospBox    = { background: "#f8f9fa", borderRadius: "10px", padding: "12px 20px", margin: "12px 0" };
const hospName   = { fontSize: "16px", fontWeight: 700, color: "#2c3e50", margin: 0 };
const hospAddr   = { fontSize: "12px", color: "#888", margin: "4px 0 0" };
const dateTxt    = { fontSize: "14px", color: "#555", margin: "14px 0" };
const dividerLine= (c) => ({ height: "2px", background: `linear-gradient(90deg,transparent,${c}60,transparent)`, margin: "20px 0" });
const tokenRow   = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" };
const verBadge   = { display: "flex", alignItems: "center", gap: "6px", background: "#eafaf1", border: "1px solid #a9dfbf", borderRadius: "8px", padding: "8px 14px" };
const verTxt     = { fontSize: "13px", fontWeight: 600, color: "#27ae60" };
const tokenLbl   = { fontSize: "10px", color: "#aaa", textTransform: "uppercase", letterSpacing: "0.8px", margin: 0 };
const tokenVal   = { fontSize: "10px", color: "#666", fontFamily: "monospace", wordBreak: "break-all", margin: "2px 0 0" };
const footerTxt  = { fontSize: "12px", color: "#888", margin: 0 };