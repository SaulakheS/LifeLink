import express from "express";
import pool from "../db.js";
import { handleTimeout } from "../utils/timeoutHandler.js";

const router = express.Router();

// ─── BLOOD GROUP COMPATIBILITY MAP ───────────────────────────────────────────
const COMPATIBLE_DONORS = {
  "A+":  ["A+", "A-", "O+", "O-"],
  "A-":  ["A-", "O-"],
  "B+":  ["B+", "B-", "O+", "O-"],
  "B-":  ["B-", "O-"],
  "AB+": ["AB+", "AB-", "A+", "A-", "B+", "B-", "O+", "O-"],
  "AB-": ["AB-", "A-", "B-", "O-"],
  "O+":  ["O+", "O-"],
  "O-":  ["O-"],
};

// ─── CREATE SOS ───────────────────────────────────────────────────────────────
router.post("/sos", async (req, res) => {
  const { hospital_id, blood_group } = req.body;

  if (!hospital_id || isNaN(hospital_id)) {
    return res.status(400).json({ error: "Invalid hospital_id" });
  }
  if (!blood_group) {
    return res.status(400).json({ error: "blood_group is required" });
  }
  if (!COMPATIBLE_DONORS[blood_group]) {
    return res.status(400).json({ error: "Invalid blood group" });
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

    const compatibleGroups = COMPATIBLE_DONORS[blood_group];

    const donorsResult = await pool.query(
      `SELECT
         donor_id, name, blood_group,
         ST_Distance(
           location::geography,
           ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
         ) AS distance,
         CASE WHEN blood_group = $3 THEN 1 ELSE 2 END AS priority
       FROM donors
       WHERE blood_group = ANY($4::text[])
         AND availability = true
         AND (
           last_donation_date IS NULL
           OR (LOWER(gender) = 'male'   AND last_donation_date <= NOW() - INTERVAL '90 days')
           OR (LOWER(gender) = 'female' AND last_donation_date <= NOW() - INTERVAL '120 days')
         )
       ORDER BY priority ASC, distance ASC
       LIMIT 5`,
      [lon, lat, blood_group, compatibleGroups]
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
        donor_blood_group: firstDonor.blood_group,
        location: { lat, lon },
      });

      setTimeout(() => handleTimeout(request_id, firstDonor.donor_id, io), 30000);
    }

    res.json({
      message: donors.length > 0
        ? `SOS created. ${donors.filter(d => d.priority === 1).length} exact + ${donors.filter(d => d.priority === 2).length} compatible donor(s) found.`
        : "SOS created, no matching or compatible donors found",
      request:           requestResult.rows[0],
      nearby_donors:     donors,
      compatibility_used: donors.some(d => d.priority === 2),
    });

  } catch (err) {
    console.error("SOS Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── CANCEL SOS ───────────────────────────────────────────────────────────────
// Hospital can cancel an active SOS before it's accepted or exhausted.
// - Marks request CLOSED
// - Notifies the currently active donor that the SOS is cancelled
// - Notifies hospital's socket to update live status
router.post("/cancel/:request_id", async (req, res) => {
  const { request_id } = req.params;
  const hospital_id    = req.user.id; // from JWT — ensures hospital owns this request

  try {
    const io = req.app.get("io");

    // Fetch request — verify it belongs to this hospital
    const requestData = await pool.query(
      `SELECT hospital_id, status, active_donor_id, blood_group
       FROM emergency_requests WHERE request_id = $1`,
      [request_id]
    );

    if (requestData.rows.length === 0) {
      return res.status(404).json({ message: "SOS request not found" });
    }

    const { hospital_id: owner, status, active_donor_id, blood_group } = requestData.rows[0];

    // Only the hospital that created the SOS can cancel it
    if (Number(owner) !== Number(hospital_id)) {
      return res.status(403).json({ message: "You can only cancel your own SOS requests" });
    }

    if (status === "CLOSED") {
      return res.status(400).json({ message: "SOS is already closed" });
    }

    // Mark CLOSED + clear active donor
    await pool.query(
      `UPDATE emergency_requests
       SET status = 'CLOSED', active_donor_id = NULL, donor_queue = '[]'
       WHERE request_id = $1`,
      [request_id]
    );

    // Notify the currently active donor (if any) that SOS was cancelled
    // So they don't keep seeing a pending request on their dashboard
    if (active_donor_id) {
      io.to(`donor_${active_donor_id}`).emit("sos_cancelled", {
        request_id: Number(request_id),
        message:    "The hospital has cancelled this SOS request.",
      });
      console.log(`[Cancel] SOS ${request_id} cancelled — notified donor ${active_donor_id}`);
    }

    // Notify hospital's own socket to update live status UI
    io.to(`hospital_${hospital_id}`).emit("sos_update", {
      request_id: Number(request_id),
      type:       "CANCELLED",
      blood_group,
      timestamp:  new Date().toISOString(),
      message:    "SOS request cancelled by hospital.",
    });

    res.json({ message: "SOS cancelled successfully" });

  } catch (err) {
    console.error("Cancel SOS error:", err);
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
            sosReq.status === "OPEN" ? "PENDING" :
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