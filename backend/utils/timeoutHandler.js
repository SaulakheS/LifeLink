import pool from "../db.js";
import { isDonorEligible } from "./donorEligibility.js";

export const handleTimeout = async (request_id, currentDonorId, io) => {
  try {
    console.log(`⏱ Timeout check — donor ${currentDonorId}, request ${request_id}`);

    const requestCheck = await pool.query(
      `SELECT status, hospital_id, blood_group, active_donor_id
       FROM emergency_requests WHERE request_id = $1`,
      [request_id]
    );

    const requestRow = requestCheck.rows[0];
    if (!requestRow || requestRow.status === "CLOSED") {
      console.log(`Request ${request_id} already closed. Stopping.`);
      return;
    }

    const { hospital_id, blood_group, active_donor_id } = requestRow;

    // FIX: Guard null active_donor_id explicitly before Number() comparison
    // Number(null) = 0 which could cause false matches
    if (active_donor_id === null || active_donor_id === undefined) {
      console.log(`active_donor_id is null for request ${request_id}. Stopping.`);
      return;
    }

    // Only process if this donor is still the active one
    if (Number(active_donor_id) !== Number(currentDonorId)) {
      console.log(`Donor ${currentDonorId} no longer active (active=${active_donor_id}). Stopping.`);
      return;
    }

    // Stop if donor already responded manually before timeout fired
    const response = await pool.query(
      `SELECT * FROM request_responses WHERE request_id = $1 AND donor_id = $2`,
      [request_id, currentDonorId]
    );
    if (response.rows.length > 0) {
      console.log(`Donor ${currentDonorId} already responded. Skipping timeout.`);
      return;
    }

    const attempt = await pool.query(
      `SELECT COUNT(*) FROM request_responses WHERE request_id = $1`,
      [request_id]
    );
    const attempt_order = parseInt(attempt.rows[0].count, 10) + 1;
    await pool.query(
      `INSERT INTO request_responses
         (request_id, donor_id, response_status, response_time, attempt_order)
       VALUES ($1, $2, 'NOT_RESPONDED', CURRENT_TIMESTAMP, $3)`,
      [request_id, currentDonorId, attempt_order]
    );

    // Get queue and remove timed-out donor
    const result = await pool.query(
      `SELECT donor_queue FROM emergency_requests WHERE request_id = $1`,
      [request_id]
    );

    let queue = result.rows[0]?.donor_queue;
    if (!queue) return;
    if (typeof queue === "string") queue = JSON.parse(queue);

    const remaining = queue.filter((id) => Number(id) !== Number(currentDonorId));

    if (remaining.length === 0) {
      console.log(`No more donors for request ${request_id} after timeout.`);
      await pool.query(
        `UPDATE emergency_requests
         SET status = 'CLOSED', active_donor_id = NULL
         WHERE request_id = $1`,
        [request_id]
      );
      io.to(`hospital_${hospital_id}`).emit("sos_update", {
        request_id, type: "FAILED", blood_group,
        timestamp: new Date().toISOString(),
        message: "All nearby donors have timed out. No eligible donors remaining.",
      });
      return;
    }

    // FIX: Check BOTH availability AND cooldown for next donor in queue
    // They may have become unavailable since queue was built (accepted another SOS)
    let nextDonor = null;
    const stillRemaining = [];

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
        if (!nextDonor) nextDonor = id; // take first eligible
        stillRemaining.push(id);
      }
    }

    if (!nextDonor) {
      console.log(`No eligible donors remaining after timeout for request ${request_id}.`);
      await pool.query(
        `UPDATE emergency_requests
         SET status = 'CLOSED', active_donor_id = NULL, donor_queue = $1
         WHERE request_id = $2`,
        [JSON.stringify([]), request_id]
      );
      io.to(`hospital_${hospital_id}`).emit("sos_update", {
        request_id, type: "FAILED", blood_group,
        timestamp: new Date().toISOString(),
        message: "All nearby donors have timed out or are no longer available.",
      });
      return;
    }

    // Update queue to only eligible remaining donors + set active
    await pool.query(
      `UPDATE emergency_requests
       SET donor_queue = $1, active_donor_id = $2
       WHERE request_id = $3`,
      [JSON.stringify(stillRemaining), nextDonor, request_id]
    );

    io.to(`hospital_${hospital_id}`).emit("sos_update", {
      request_id, type: "TIMEOUT", blood_group,
      timestamp: new Date().toISOString(),
      message: `Donor did not respond in time. Trying the next donor...`,
    });

    const sosData = await pool.query(
      `SELECT blood_group,
              ST_Y(location::geometry) AS lat,
              ST_X(location::geometry) AS lon
       FROM emergency_requests WHERE request_id = $1`,
      [request_id]
    );
    const sos = sosData.rows[0];

    console.log(`Timeout → notifying donor ${nextDonor}`);
    io.to(`donor_${nextDonor}`).emit("new_sos", {
      request_id,
      blood_group: sos.blood_group,
      location: { lat: sos.lat, lon: sos.lon },
    });

    setTimeout(() => handleTimeout(request_id, nextDonor, io), 30000);

  } catch (err) {
    console.error("Timeout Handler Error:", err);
  }
};