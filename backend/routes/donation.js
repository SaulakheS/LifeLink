import express from "express";
import pool from "../db.js";

const router = express.Router();

// ─── MARK DONATION COMPLETE ───────────────────────────────────────────────────
// Note: This route is a manual admin override.
// Normal donation flow uses responses.js which takes donor_id from JWT.
// This uses req.user.id from JWT — consistent with rest of the system.
router.post("/complete", async (req, res) => {
  const donor_id = req.user.id; // FIX: from JWT not req.body

  try {
    const result = await pool.query(
      `UPDATE donors
       SET last_donation_date = NOW(), availability = false
       WHERE donor_id = $1
       RETURNING donor_id, last_donation_date`,
      [donor_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Donor not found" });
    }

    res.json({
      message: "Donation recorded. Donor locked for cooldown period.",
      donor: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;