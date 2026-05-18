import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import SelectRole from "./pages/SelectRole";
import DonorLogin from "./pages/DonorLogin";
import HospitalLogin from "./pages/HospitalLogin";
import HospitalRegister from "./pages/HospitalRegister";
import HospitalDashboard from "./pages/HospitalDashboard";
import Dashboard from "./pages/Dashboard";

function App() {
  return (
    <Router>
      <Routes>
        {/* Entry point */}
        <Route path="/" element={<SelectRole />} />

        {/* Donor */}
        <Route path="/donor-login" element={<DonorLogin />} />

        {/* Hospital */}
        <Route path="/hospital-login" element={<HospitalLogin />} />
        <Route path="/hospital-register" element={<HospitalRegister />} />

        {/* Dashboards */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/hospital-dashboard" element={<HospitalDashboard />} />

        {/* Old URL redirect */}
        <Route path="/create-sos" element={<Navigate to="/hospital-dashboard" replace />} />

        {/* 404 — redirect unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;