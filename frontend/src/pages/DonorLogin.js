import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Auth.css";
import LocationPicker from "../components/LocationPicker";
import API_BASE from "../config";

export default function DonorLogin() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]       = useState("");
  const [phone, setPhone]     = useState("");
  const [blood, setBlood]     = useState("A+");
  const [gender, setGender]   = useState("Male");
  const [address, setAddress] = useState("");
  const [lat, setLat]         = useState("");
  const [lon, setLon]         = useState("");
  // FIX: Added loading state — prevents multiple API calls on rapid clicks
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setLat(pos.coords.latitude); setLon(pos.coords.longitude); },
        () => alert("Could not get GPS. Please select on map.")
      );
    } else {
      alert("Geolocation not supported");
    }
  };

  // ─── LOGIN ────────────────────────────────────────────────────────────────
  const login = async () => {
    if (!email || !password) { alert("Enter email and password"); return; }
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role: "user" }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message || "Invalid email or password"); return; }
      localStorage.setItem("donor_id", data.id);
      localStorage.setItem("donor_name", data.name);
      localStorage.setItem("token", data.token);
      navigate("/dashboard");
    } catch {
      alert("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ─── REGISTER ─────────────────────────────────────────────────────────────
  const register = async () => {
    if (!name || !email || !password) { alert("Name, email and password are required"); return; }
    if (!lat || !lon) { alert("Please select your location on the map or use GPS"); return; }
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/auth/register-donor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, phone, email, password,
          blood_group: blood, address, lat, lon, gender,
        }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Registration failed"); return; }
      alert("Registered Successfully! Please login.");
      setIsLogin(true);
    } catch {
      alert("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>{isLogin ? "🩸 Donor Login" : "🩸 Register Donor"}</h2>

        {!isLogin && (
          <>
            <label>Full Name</label>
            <input placeholder="Your full name" onChange={(e) => setName(e.target.value)} />
            <label>Phone</label>
            <input placeholder="Phone number" onChange={(e) => setPhone(e.target.value)} />
          </>
        )}

        <label>Email Address</label>
        <input type="email" placeholder="you@example.com" onChange={(e) => setEmail(e.target.value)} />

        <label>Password</label>
        <input type="password" placeholder="Enter password" onChange={(e) => setPassword(e.target.value)} />

        {!isLogin && (
          <>
            <label>Address</label>
            <input placeholder="Street, area" onChange={(e) => setAddress(e.target.value)} />

            <label>Blood Group</label>
            <select onChange={(e) => setBlood(e.target.value)}>
              {["A+","A-","B+","B-","O+","O-","AB+","AB-"].map((g) => <option key={g}>{g}</option>)}
            </select>

            <label>Gender</label>
            <select onChange={(e) => setGender(e.target.value)}>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>

            <label>Your Location</label>
            <button className="btn-secondary" onClick={getLocation}>📍 Use GPS Location</button>
            <div className="auth-map-wrapper">
              <LocationPicker setLat={setLat} setLon={setLon} />
            </div>
            {lat && lon && (
              <p className="location-confirm">
                ✅ {Number(lat).toFixed(4)}, {Number(lon).toFixed(4)}
              </p>
            )}
          </>
        )}

        <button onClick={isLogin ? login : register} disabled={loading}>
          {loading ? "Please wait..." : isLogin ? "Login" : "Create Account"}
        </button>

        <p className="toggle" onClick={() => !loading && setIsLogin(!isLogin)}>
          {isLogin
            ? <>New donor? <strong>Register here</strong></>
            : <>Already registered? <strong>Login here</strong></>}
        </p>
      </div>
    </div>
  );
}