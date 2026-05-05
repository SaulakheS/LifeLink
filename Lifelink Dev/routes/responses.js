import express from "express";
import pool from "../db.js";
import { handleTimeout } from "../utils/timeoutHandler.js";
import { isDonorEligible } from "../utils/donorEligibility.js";

const router = express.Router();

const notifyHospital = (io, hospital_id, request_id, type, extra = {}) => {
  io.to(`hospital_${hospital_id}`).emit("sos_update", {
    request_id, type, timestamp: new Date().toISOString(), ...extra,
  });
};

router.post("/", async (req, res) => {
  const io = req.app.get("io");
  const { request_id, response_status } = req.body;
  const donor_id = req.user.id;

  console.log("─────────────────────────────────────────");
  console.log(`[Response] request_id=${request_id} donor_id=${donor_id} status=${response_status}`);

  if (!request_id || !response_status) {
    return res.status(400).json({ message: "request_id and response_status are required" });
  }

  try {
    const requestData = await pool.query(
      `SELECT hospital_id, blood_group, status, donor_queue, active_donor_id
       FROM emergency_requests WHERE request_id = $1`,
      [request_id]
    );

    if (requestData.rows.length === 0) {
      return res.status(404).json({ message: "SOS request not found" });
    }

    const { hospital_id, blood_group, status, donor_queue, active_donor_id } = requestData.rows[0];

    console.log(`[Response] request status=${status} active_donor_id=${active_donor_id}`);

    if (status === "CLOSED") {
      console.log("[Response] Already closed — ignoring");
      return res.json({ message: "Request already closed" });
    }

    // FIX: Guard null active_donor_id — prevents Number(null)=0 false match
    if (active_donor_id === null || active_donor_id === undefined) {
      console.warn("[Response] ❌ active_donor_id is null — request may already be closing");
      return res.status(403).json({ message: "No active donor for this request." });
    }

    if (Number(active_donor_id) !== Number(donor_id)) {
      console.warn(`[Response] ❌ BLOCKED — active=${active_donor_id}, responding=${donor_id}`);
      return res.status(403).json({
        message: "You are not the currently notified donor for this request.",
      });
    }

    // Check hasn't already responded
    const alreadyRes = await pool.query(
      `SELECT donor_id FROM request_responses
       WHERE request_id = $1 AND donor_id = $2`,
      [request_id, donor_id]
    );
    if (alreadyRes.rows.length > 0) {
      console.log(`[Response] Donor ${donor_id} already responded — ignoring duplicate`);
      return res.json({ message: "Already responded" });
    }

    console.log(`[Response] ✅ Validated donor ${donor_id} — processing ${response_status}`);

    const donorData = await pool.query(
      `SELECT name FROM donors WHERE donor_id = $1`, [donor_id]
    );
    const donorName = donorData.rows[0]?.name || "A donor";

    const attempt = await pool.query(
      `SELECT COUNT(*) FROM request_responses WHERE request_id = $1`,
      [request_id]
    );
    const attempt_order = parseInt(attempt.rows[0].count) + 1;

    await pool.query(
      `INSERT INTO request_responses
        (request_id, donor_id, response_status, response_time, attempt_order)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4)`,
      [request_id, donor_id, response_status, attempt_order]
    );

    // ─── ACCEPTED ─────────────────────────────────────────────────────────────
    if (response_status === "ACCEPTED") {
      await pool.query(
        `UPDATE emergency_requests
         SET status = 'CLOSED', active_donor_id = NULL
         WHERE request_id = $1`,
        [request_id]
      );
      await pool.query(
        `UPDATE donors SET availability = false, last_donation_date = CURRENT_TIMESTAMP
         WHERE donor_id = $1`,
        [donor_id]
      );
      console.log(`[Response] ✅ ACCEPTED — donor ${donor_id} (${donorName}) locked in DB`);

      notifyHospital(io, hospital_id, request_id, "ACCEPTED", {
        donor_name: donorName, blood_group,
        message: `${donorName} has accepted your SOS and is on the way.`,
      });

      return res.json({ message: "Request accepted" });
    }

    // ─── REJECTED ─────────────────────────────────────────────────────────────
    if (response_status === "REJECTED") {
      let queue = donor_queue;
      if (typeof queue === "string") queue = JSON.parse(queue);
      const queueAsNumbers = (queue || []).map(Number);

      const remaining = queueAsNumbers.filter((id) => id !== Number(donor_id));

      // FIX: Check BOTH eligibility (cooldown) AND current availability
      // A donor in queue could have accepted another SOS since queue was built
      let nextDonorId = null;
      for (const id of remaining) {
        const d = await pool.query(
          `SELECT last_donation_date, gender, availability FROM donors WHERE donor_id = $1`, [id]
        );
        const donor = d.rows[0];
        if (
          donor &&
          donor.availability === true &&
          isDonorEligible(donor.last_donation_date, donor.gender)
        ) {
          nextDonorId = id;
          break;
        }
      }

      if (!nextDonorId) {
        await pool.query(
          `UPDATE emergency_requests
           SET status = 'CLOSED', donor_queue = $1, active_donor_id = NULL
           WHERE request_id = $2`,
          [JSON.stringify(remaining), request_id]
        );
        notifyHospital(io, hospital_id, request_id, "FAILED", {
          blood_group,
          message: "All nearby donors have declined or are unavailable.",
        });
        return res.json({ message: "No eligible donors remaining" });
      }

      await pool.query(
        `UPDATE emergency_requests
         SET donor_queue = $1, active_donor_id = $2
         WHERE request_id = $3`,
        [JSON.stringify(remaining), nextDonorId, request_id]
      );

      notifyHospital(io, hospital_id, request_id, "REJECTED", {
        donor_name: donorName, blood_group,
        message: `${donorName} declined. Trying the next donor...`,
      });

      const sosData = await pool.query(
        `SELECT blood_group,
                ST_Y(location::geometry) AS lat,
                ST_X(location::geometry) AS lon
         FROM emergency_requests WHERE request_id = $1`,
        [request_id]
      );
      const sos = sosData.rows[0];

      io.to(`donor_${nextDonorId}`).emit("new_sos", {
        request_id,
        blood_group: sos.blood_group,
        location: { lat: sos.lat, lon: sos.lon },
      });

      setTimeout(() => handleTimeout(request_id, nextDonorId, io), 30000);
      return res.json({ message: "Next eligible donor notified", next_donor: nextDonorId });
    }

    return res.status(400).json({ message: "Invalid response_status." });

  } catch (err) {
    console.error("[Response] ❌ Error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;