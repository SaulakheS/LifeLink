import { useState } from "react";
import { useNavigate } from "react-router-dom";
import LocationPicker from "../components/LocationPicker";
import API_BASE from "../config";
import "./Auth.css";

export default function HospitalRegister() {
  const [form, setForm] = useState({
    name: "", email: "", password: "", confirmPassword: "",
    phone: "", address: "", locality: "",
  });
  const [lat, setLat]         = useState("");
  const [lon, setLon]         = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: "" });
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setLat(pos.coords.latitude); setLon(pos.coords.longitude); },
        () => alert("Could not get GPS. Please select on map.")
      );
    } else alert("Geolocation not supported");
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())                      e.name = "Hospital name is required";
    if (!form.email.trim())                     e.email = "Email is required";
    if (!form.password)                         e.password = "Password is required";
    if (form.password.length < 6)               e.password = "Minimum 6 characters";
    if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match";
    if (!form.phone.trim())                     e.phone = "Phone number is required";
    if (!form.address.trim())                   e.address = "Address is required";
    if (!form.locality.trim())                  e.locality = "Locality is required";
    if (!lat || !lon)                           e.location = "Please select location on map";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/auth/register-hospital`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(), email: form.email.trim().toLowerCase(),
          password: form.password, phone: form.phone.trim(),
          address: form.address.trim(), locality: form.locality.trim(),
          lat, lon,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error?.includes("Email")) setErrors({ email: "Email already registered" });
        else alert(data.message || data.error || "Registration failed");
        return;
      }
      alert("Hospital registered! Please login.");
      navigate("/hospital-login");
    } catch { alert("Server error. Please try again."); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">

        <h2>🏥 Register Hospital</h2>

        {/* FIX: Removed all inline styles — now using Auth.css classes consistently */}
        {/* This makes the register form match the login form visually */}

        <label>Hospital Name</label>
        <input name="name" placeholder="City General Hospital" onChange={handleChange} />
        {errors.name && <span className="auth-error">{errors.name}</span>}

        <label>Email Address</label>
        <input name="email" type="email" placeholder="hospital@example.com" onChange={handleChange} />
        {errors.email && <span className="auth-error">{errors.email}</span>}

        <label>Password</label>
        <input name="password" type="password" placeholder="Minimum 6 characters" onChange={handleChange} />
        {errors.password && <span className="auth-error">{errors.password}</span>}

        <label>Confirm Password</label>
        <input name="confirmPassword" type="password" placeholder="Re-enter password" onChange={handleChange} />
        {errors.confirmPassword && <span className="auth-error">{errors.confirmPassword}</span>}

        <label>Phone Number</label>
        <input name="phone" type="tel" placeholder="9876543210" onChange={handleChange} />
        {errors.phone && <span className="auth-error">{errors.phone}</span>}

        <label>Full Address</label>
        <input name="address" placeholder="Street, building, area" onChange={handleChange} />
        {errors.address && <span className="auth-error">{errors.address}</span>}

        <label>Locality / City</label>
        <input name="locality" placeholder="e.g. Pune, Mumbai" onChange={handleChange} />
        {errors.locality && <span className="auth-error">{errors.locality}</span>}

        <label>Hospital Location on Map</label>
        <button className="btn-secondary" onClick={getLocation}>📍 Use GPS Location</button>
        <div className="auth-map-wrapper">
          <LocationPicker setLat={setLat} setLon={setLon} />
        </div>
        {lat && lon
          ? <p className="location-confirm">✅ {Number(lat).toFixed(4)}, {Number(lon).toFixed(4)}</p>
          : errors.location && <span className="auth-error">{errors.location}</span>
        }

        <button onClick={handleRegister} disabled={loading}>
          {loading ? "Registering..." : "Register Hospital"}
        </button>

        <p className="toggle" onClick={() => navigate("/hospital-login")}>
          Already registered? <strong>Login here</strong>
        </p>

      </div>
    </div>
  );
}