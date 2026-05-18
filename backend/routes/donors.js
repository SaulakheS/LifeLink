import express from "express";
import pool from "../db.js";
import { isDonorEligible } from "../utils/donorEligibility.js";

const router = express.Router();

// ─── GET ALL ELIGIBLE DONORS ──────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM donors`);
    // FIX: Uses shared isDonorEligible — single source of truth
    const eligibleDonors = result.rows.filter((donor) =>
      isDonorEligible(donor.last_donation_date, donor.gender)
    );
    res.json(eligibleDonors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── RECORD DONATION ──────────────────────────────────────────────────────────
router.post("/donate", async (req, res) => {
  const donor_id = req.user.id;
  try {
    const result = await pool.query(
      `UPDATE donors
       SET last_donation_date = NOW(), availability = false
       WHERE donor_id = $1
       RETURNING donor_id, last_donation_date, availability`,
      [donor_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Donor not found" });
    }
    res.json({ message: "Donation recorded successfully", donor: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── MAKE DONOR AVAILABLE AGAIN ───────────────────────────────────────────────
router.post("/make-available", async (req, res) => {
  const donor_id = req.user.id;
  try {
    await pool.query(
      `UPDATE donors SET availability = true WHERE donor_id = $1`,
      [donor_id]
    );
    res.json({ message: "Donor is now available again" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DONOR HISTORY ────────────────────────────────────────────────────────────
router.get("/history", async (req, res) => {
  const donor_id = req.user.id;
  try {
    const result = await pool.query(
      `SELECT
         er.request_id,
         er.blood_group,
         er.status        AS request_status,
         er.created_at,
         h.name           AS hospital_name,
         h.address        AS hospital_address,
         rr.response_status,
         rr.response_time,
         rr.attempt_order
       FROM emergency_requests er
       JOIN hospitals h ON er.hospital_id = h.hospital_id
       LEFT JOIN request_responses rr
         ON rr.request_id = er.request_id
         AND rr.donor_id = $1
       WHERE
         rr.donor_id = $1
         OR (
           er.donor_queue IS NOT NULL
           AND er.donor_queue @> jsonb_build_array($1::int)
         )
       ORDER BY er.created_at DESC
       LIMIT 50`,
      [donor_id]
    );

    const history = result.rows.map((row) => ({
      ...row,
      response_status: row.response_status || "NOT_RESPONDED",
    }));

    res.json(history);
  } catch (err) {
    console.error("Donor history error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;