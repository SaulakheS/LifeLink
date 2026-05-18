import { useState, useEffect } from "react";
import API_BASE from "../config";
import "../pages/Dashboard.css";

export default function Notification({ data, onDismiss }) {
  const [status, setStatus]     = useState(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [loading, setLoading]   = useState(false);

  // ─── COUNTDOWN TIMER ──────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // FIX: Auto-dismiss after timer expires with no response
  // Shows "expired" for 2s then removes card and refreshes history
  useEffect(() => {
    if (timeLeft === 0 && !status) {
      const t = setTimeout(() => {
        if (onDismiss) onDismiss();
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [timeLeft, status, onDismiss]);

  // ─── SEND RESPONSE ────────────────────────────────────────────────────────
  const sendResponse = async (response) => {
    if (loading || status) return;
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/responses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token,
        },
        body: JSON.stringify({
          request_id: data.request_id,
          response_status: response,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        console.error("Response error:", err);
        return;
      }

      setStatus(response);
      setTimeout(() => { if (onDismiss) onDismiss(); }, 2000);

    } catch (err) {
      console.error("Response Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="notif-card">
      <h3 className="notif-title">🚨 SOS Alert</h3>
      <p className="notif-info"><b>Blood Group:</b> {data.blood_group}</p>
      <p className="notif-info">
        <b>Location:</b>{" "}
        {data.location?.lat?.toFixed(4)}, {data.location?.lon?.toFixed(4)}
      </p>
      <p className="notif-timer">⏱ Time left: <b>{timeLeft} sec</b></p>

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
          {status === "ACCEPTED" ? "✅ Accepted — Thank you!" : "❌ Rejected"}
        </p>
      )}

      {timeLeft === 0 && !status && (
        <p className="notif-expired">⏱ Request expired — dismissing...</p>
      )}
    </div>
  );
}