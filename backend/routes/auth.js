import express from "express";
import pool from "../db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import "dotenv/config";
import { verifyToken } from "../middleware/authMiddleware.js";
import { tokenBlacklist } from "../utils/tokenBlacklist.js";

const router = express.Router();

// ─── LOGIN (DONOR + HOSPITAL) ─────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  let { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ message: "Email, password and role required" });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    let result;

    if (role === "user") {
      result = await pool.query(
        `SELECT * FROM donors WHERE LOWER(TRIM(email)) = $1`, [cleanEmail]
      );
      if (result.rows.length === 0)
        return res.status(401).json({ message: "Invalid credentials" });

    } else if (role === "hospital") {
      result = await pool.query(
        `SELECT * FROM hospitals WHERE LOWER(TRIM(email)) = $1`, [cleanEmail]
      );
      if (result.rows.length === 0)
        return res.status(401).json({ message: "Invalid credentials" });

    } else {
      return res.status(400).json({ message: "Invalid role" });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(cleanPassword, user.password);
    if (!valid) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.donor_id || user.hospital_id, role },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    return res.json({
      token,
      role,
      id: user.donor_id || user.hospital_id,
      name: user.name,
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
router.post("/logout", (req, res) => {
  const token = req.headers["authorization"];

  if (!token) {
    return res.status(400).json({ message: "No token provided" });
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    tokenBlacklist.add(token);
    return res.json({ message: "Logged out successfully" });
  } catch {
    // Token already expired — still fine, nothing to blacklist
    return res.json({ message: "Logged out (token already expired)" });
  }
});

// ─── REGISTER HOSPITAL ────────────────────────────────────────────────────────
router.post("/register-hospital", async (req, res) => {
  const { name, email, password, phone, address, locality, lat, lon } = req.body;

  if (!email || !password || !name)
    return res.status(400).json({ message: "Required fields missing" });

  try {
    const cleanEmail = email.trim().toLowerCase();
    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    const result = await pool.query(
      `INSERT INTO hospitals 
        (name, email, password, phone, address, locality, location)
       VALUES ($1, $2, $3, $4, $5, $6, ST_SetSRID(ST_MakePoint($7, $8), 4326))
       RETURNING hospital_id, name, email`,
      [name, cleanEmail, hashedPassword, phone, address, locality, lon, lat]
    );

    res.json({ message: "Hospital registered successfully", hospital: result.rows[0] });
  } catch (err) {
    if (err.code === "23505")
      return res.status(400).json({ error: "Email already exists" });
    res.status(500).json({ error: err.message });
  }
});

// ─── REGISTER DONOR ───────────────────────────────────────────────────────────
router.post("/register-donor", async (req, res) => {
  const { name, phone, email, password, blood_group, address, lat, lon, gender } = req.body;

  if (!email || !password || !name)
    return res.status(400).json({ message: "Name, email and password are required" });

  if (!lat || !lon)
    return res.status(400).json({ message: "Location is required" });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO donors 
        (name, phone, email, password, blood_group, address, location, availability, gender)
       VALUES ($1, $2, $3, $4, $5, $6, ST_SetSRID(ST_MakePoint($7, $8), 4326), true, $9)
       RETURNING donor_id, name, email, blood_group`,
      [name, phone, email, hashedPassword, blood_group, address, lon, lat, gender]
    );

    res.json({ message: "Donor registered successfully", donor: result.rows[0] });
  } catch (err) {
    if (err.code === "23505")
      return res.status(400).json({ error: "Email already exists" });
    res.status(500).json({ error: err.message });
  }
});



// ─── GET HOSPITAL PROFILE ─────────────────────────────────────────────────────
router.get("/hospital-profile", verifyToken, async (req, res) => {
  const hospital_id = req.user.id;
  try {
    const result = await pool.query(
      `SELECT hospital_id, name, email, phone, address, locality,
              ST_Y(location::geometry) AS lat,
              ST_X(location::geometry) AS lon
       FROM hospitals WHERE hospital_id = $1`,
      [hospital_id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: "Hospital not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── UPDATE HOSPITAL PASSWORD ─────────────────────────────────────────────────
router.put("/hospital-password", verifyToken, async (req, res) => {
  const hospital_id = req.user.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword)
    return res.status(400).json({ message: "Current and new password required" });
  if (newPassword.length < 6)
    return res.status(400).json({ message: "New password must be at least 6 characters" });

  try {
    const result = await pool.query(
      `SELECT password FROM hospitals WHERE hospital_id = $1`, [hospital_id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: "Hospital not found" });

    const valid = await bcrypt.compare(currentPassword, result.rows[0].password);
    if (!valid)
      return res.status(401).json({ message: "Current password is incorrect" });

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query(
      `UPDATE hospitals SET password = $1 WHERE hospital_id = $2`,
      [hashed, hospital_id]
    );

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── UPDATE HOSPITAL LOCATION ─────────────────────────────────────────────────
router.put("/hospital-location", verifyToken, async (req, res) => {
  const hospital_id = req.user.id;
  const { lat, lon, address, locality } = req.body;

  if (!lat || !lon)
    return res.status(400).json({ message: "lat and lon are required" });

  try {
    const result = await pool.query(
      `UPDATE hospitals
       SET location = ST_SetSRID(ST_MakePoint($1, $2), 4326),
           address  = COALESCE($3, address),
           locality = COALESCE($4, locality)
       WHERE hospital_id = $5
       RETURNING name, address, locality`,
      [lon, lat, address || null, locality || null, hospital_id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: "Hospital not found" });

    res.json({ message: "Location updated successfully", hospital: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;