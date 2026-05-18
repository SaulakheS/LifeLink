import express from "express";
import pool from "../db.js";
import { handleTimeout } from "../utils/timeoutHandler.js";

const router = express.Router();

// ─── CREATE SOS ───────────────────────────────────────────────────────────────
router.post("/sos", async (req, res) => {
  const { hospital_id, blood_group } = req.body;

  if (!hospital_id || isNaN(hospital_id)) {
    return res.status(400).json({ error: "Invalid hospital_id" });
  }
  if (!blood_group) {
    return res.status(400).json({ error: "blood_group is required" });
  }

  try {
    const io = req.app.get("io");

    const hospitalResult = await pool.query(
      `SELECT hospital_id,
              ST_Y(location::geometry) AS lat,
              ST_X(location::geometry) AS lon
       FROM hospitals WHERE hospital_id = $1`,
      [hospital_id]
    );

    if (hospitalResult.rows.length === 0) {
      return res.status(403).json({ message: "Only registered hospitals can create SOS" });
    }

    const { lat, lon } = hospitalResult.rows[0];

    if (!lat || !lon) {
      return res.status(400).json({
        error: "Hospital location not set. Please re-register with a valid location.",
      });
    }

    const requestResult = await pool.query(
      `INSERT INTO emergency_requests (hospital_id, blood_group, location)
       VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326))
       RETURNING *`,
      [hospital_id, blood_group, lon, lat]
    );

    const request_id = requestResult.rows[0].request_id;

    // FIX: Added eligibility check (cooldown) to initial query — not just availability
    // Prevents donors who manually had availability reset but are still in cooldown
    const donorsResult = await pool.query(
      `SELECT donor_id, name, blood_group,
              ST_Distance(location::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) AS distance
       FROM donors
       WHERE blood_group = $3
         AND availability = true
         AND (
           last_donation_date IS NULL
           OR (LOWER(gender) = 'male'   AND last_donation_date <= NOW() - INTERVAL '90 days')
           OR (LOWER(gender) = 'female' AND last_donation_date <= NOW() - INTERVAL '120 days')
         )
       ORDER BY distance
       LIMIT 5`,
      [lon, lat, blood_group]
    );

    const donors = donorsResult.rows;

    if (donors.length > 0) {
      const firstDonor = donors[0];

      await pool.query(
        `UPDATE emergency_requests
         SET donor_queue = $1, active_donor_id = $2
         WHERE request_id = $3`,
        [JSON.stringify(donors.map((d) => d.donor_id)), firstDonor.donor_id, request_id]
      );

      io.to(`donor_${firstDonor.donor_id}`).emit("new_sos", {
        request_id,
        blood_group,
        location: { lat, lon },
      });

      setTimeout(() => handleTimeout(request_id, firstDonor.donor_id, io), 30000);
    }

    res.json({
      message: donors.length > 0 ? "SOS created and sent" : "SOS created, no matching donors found",
      request: requestResult.rows[0],
      nearby_donors: donors,
    });

  } catch (err) {
    console.error("SOS Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── HOSPITAL SOS HISTORY ─────────────────────────────────────────────────────
router.get("/history", async (req, res) => {
  const hospital_id = req.user.id;

  try {
    const sosRequests = await pool.query(
      `SELECT request_id, blood_group, status, created_at, donor_queue
       FROM emergency_requests
       WHERE hospital_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [hospital_id]
    );

    const history = await Promise.all(
      sosRequests.rows.map(async (sosReq) => {
        const responsesResult = await pool.query(
          `SELECT rr.response_status, rr.response_time, rr.attempt_order,
                  d.name AS donor_name, d.blood_group AS donor_blood_group
           FROM request_responses rr
           JOIN donors d ON d.donor_id = rr.donor_id
           WHERE rr.request_id = $1
           ORDER BY rr.attempt_order ASC`,
          [sosReq.request_id]
        );

        let originalQueueLength = 0;
        try {
          const q = typeof sosReq.donor_queue === "string"
            ? JSON.parse(sosReq.donor_queue)
            : sosReq.donor_queue;
          originalQueueLength = (q?.length || 0) + responsesResult.rows.length;
        } catch { originalQueueLength = responsesResult.rows.length; }

        return {
          request_id:   sosReq.request_id,
          blood_group:  sosReq.blood_group,
          status:       sosReq.status,
          created_at:   sosReq.created_at,
          donors_found: originalQueueLength,
          responses:    responsesResult.rows,
          outcome:
            sosReq.status === "OPEN"    ? "PENDING" :
            responsesResult.rows.some(r => r.response_status === "ACCEPTED") ? "ACCEPTED" :
            "FAILED",
        };
      })
    );

    res.json(history);
  } catch (err) {
    console.error("Hospital history error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;