import pool from "../db.js";
import cron from "node-cron";

// ─── DONOR AVAILABILITY AUTO-RESET ───────────────────────────────────────────
// Runs every day at midnight (00:00).
// Finds donors whose cooldown period has ended and resets availability to true.
//
// Cooldown rules (same as isDonorEligible):
//   Male   → 90 days after last donation
//   Female → 120 days after last donation

export const startDonorResetCron = () => {
  cron.schedule("0 0 * * *", async () => {
    console.log("[Cron] Running donor availability reset...");

    try {
      const result = await pool.query(
        `UPDATE donors
         SET availability = true
         WHERE availability = false
           AND last_donation_date IS NOT NULL
           AND (
             (LOWER(gender) = 'male'   AND last_donation_date <= NOW() - INTERVAL '90 days')
             OR
             (LOWER(gender) = 'female' AND last_donation_date <= NOW() - INTERVAL '120 days')
           )
         RETURNING donor_id, name, gender, last_donation_date`
      );

      if (result.rows.length > 0) {
        console.log(`[Cron] ✅ Reset ${result.rows.length} donor(s):`);
        result.rows.forEach((d) => {
          console.log(`       → ${d.name} (${d.gender}) — last donated: ${new Date(d.last_donation_date).toDateString()}`);
        });
      } else {
        console.log("[Cron] No donors needed reset today.");
      }

    } catch (err) {
      console.error("[Cron] ❌ Error resetting donor availability:", err.message);
    }
  });

  console.log("[Cron] Donor availability reset job scheduled — runs daily at midnight.");
};

// ─── MANUAL TRIGGER (for testing without waiting for midnight) ────────────────
// Call this from a route or directly in server.js during dev to test immediately.
export const runResetNow = async () => {
  console.log("[Cron] Manual reset triggered...");

  try {
    const result = await pool.query(
      `UPDATE donors
       SET availability = true
       WHERE availability = false
         AND last_donation_date IS NOT NULL
         AND (
           (LOWER(gender) = 'male'   AND last_donation_date <= NOW() - INTERVAL '90 days')
           OR
           (LOWER(gender) = 'female' AND last_donation_date <= NOW() - INTERVAL '120 days')
         )
       RETURNING donor_id, name, gender, last_donation_date`
    );

    console.log(`[Cron] Manual reset — ${result.rows.length} donor(s) updated.`);
    return result.rows;

  } catch (err) {
    console.error("[Cron] Manual reset error:", err.message);
    return [];
  }
};