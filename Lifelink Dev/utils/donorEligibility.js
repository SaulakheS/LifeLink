// ─── SHARED DONOR ELIGIBILITY HELPER ─────────────────────────────────────────
// Single source of truth — used by donors.js, responses.js, timeoutHandler.js
// Cooldown: Male = 90 days, Female = 120 days after last donation

export const isDonorEligible = (lastDonationDate, gender) => {
  if (!lastDonationDate) return true;
  const diffDays = (Date.now() - new Date(lastDonationDate)) / (1000 * 60 * 60 * 24);
  const g = gender?.toLowerCase();
  if (g === "male"   && diffDays < 90)  return false;
  if (g === "female" && diffDays < 120) return false;
  return true;
};