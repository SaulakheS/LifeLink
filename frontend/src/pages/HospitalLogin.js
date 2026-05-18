import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../config";
import "./Auth.css";

export default function HospitalLogin() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    const cleanEmail = form.email.trim().toLowerCase();
    const cleanPassword = form.password.trim();

    if (!cleanEmail || !cleanPassword) {
      alert("Enter email and password");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          password: cleanPassword,
          role: "hospital",
        }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("hospital_id", data.id);
        localStorage.setItem("token", data.token);
        localStorage.setItem("hospital_name", data.name);
        navigate("/hospital-dashboard");
      } else {
        alert(data.message || "Login failed");
      }
    } catch (err) {
      console.error("Error:", err);
      alert("Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2 style={{ textAlign: "center", color: "#2c3e50", margin: "0 0 20px" }}>
          🏥 Hospital Login
        </h2>

        <input
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />

        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        <button onClick={handleLogin} disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>

        {/* ── ADDED: Link to register page ── */}
        <p className="toggle" onClick={() => navigate("/hospital-register")}>
          New hospital? Register here
        </p>
      </div>
    </div>
  );
}