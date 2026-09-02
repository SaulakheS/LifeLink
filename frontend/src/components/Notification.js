import { useState, useEffect } from "react";
import API_BASE from "../config";
import "../pages/Dashboard.css";

export default function Notification({ data, onDismiss }) {
  const [status, setStatus]     = useState(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [loading, setLoading]   = useState(false);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-dismiss when timer expires
  useEffect(() => {
    if (timeLeft === 0 && !status) {
      const t = setTimeout(() => { if (onDismiss) onDismiss(); }, 2000);
      return () => clearTimeout(t);
    }
  }, [timeLeft, status, onDismiss]);

  const sendResponse = async (response) => {
    if (loading || status) return;
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": token },
        body: JSON.stringify({
          request_id: data.request_id,
          response_status: response,
        }),
      });
      if (!res.ok) { const err = await res.json(); console.error("Response error:", err); return; }
      setStatus(response);
      setTimeout(() => { if (onDismiss) onDismiss(); }, 2000);
    } catch (err) {
      console.error("Response Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Check if donor's blood group differs from what was requested
  // This happens when a compatible (not exact match) donor is notified
  const isCompatibleDonor =
    data.donor_blood_group &&
    data.donor_blood_group !== data.blood_group;

  return (
    <div className="notif-card">
      <h3 className="notif-title">🚨 Emergency SOS Alert</h3>

      {/* Blood group info */}
      <p className="notif-info">
        <b>Blood Needed:</b>{" "}
        <span style={{ color: "#ff7675", fontWeight: 700 }}>{data.blood_group}</span>
      </p>

      {/* Show compatibility note if donor's group differs */}
      {isCompatibleDonor && (
        <div style={{
          background: "rgba(243,156,18,0.12)",
          border: "1px solid rgba(243,156,18,0.25)",
          borderRadius: "8px",
          padding: "7px 12px",
          margin: "6px 0",
          fontSize: "12px",
          color: "#f9ca24",
        }}>
          ℹ️ Your blood group <strong>{data.donor_blood_group}</strong> is compatible with {data.blood_group} — you can donate!
        </div>
      )}

      <p className="notif-info">
        <b>Location:</b>{" "}
        {data.location?.lat?.toFixed(4)}, {data.location?.lon?.toFixed(4)}
      </p>

      <p className="notif-timer">
        ⏱ Time left: <b>{timeLeft} sec</b>
      </p>

      {!status && timeLeft > 0 && (
        <div className="notif-btn-row">
          <button
            className="notif-accept-btn"
            onClick={() => sendResponse("ACCEPTED")}
            disabled={loading}
          >
            {loading ? "Processing..." : "✅ Accept"}
          </button>
          <button
            className="notif-reject-btn"
            onClick={() => sendResponse("REJECTED")}
            disabled={loading}
          >
            ❌ Reject
          </button>
        </div>
      )}

      {status && (
        <p className="notif-status" style={{ color: status === "ACCEPTED" ? "#27ae60" : "#e74c3c" }}>
          {status === "ACCEPTED" ? "✅ Accepted — Thank you for saving a life!" : "❌ Rejected"}
        </p>
      )}

      {timeLeft === 0 && !status && (
        <p className="notif-expired">⏱ Request expired — dismissing...</p>
      )}
    </div>
  );
}