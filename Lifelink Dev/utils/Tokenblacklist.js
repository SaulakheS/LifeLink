// ─── TOKEN BLACKLIST ──────────────────────────────────────────────────────────
// Extracted to its own file to avoid circular imports between
// routes/auth.js and middleware/authMiddleware.js
//
// Tokens are pruned every hour so the Set doesn't grow indefinitely.
// For production: replace this with Redis or a DB table.

import jwt from "jsonwebtoken";
import "dotenv/config";

export const tokenBlacklist = new Set();

// Prune expired tokens from the blacklist every 60 minutes
// — no point keeping tokens that are already expired
setInterval(() => {
  for (const token of tokenBlacklist) {
    try {
      jwt.verify(token, process.env.JWT_SECRET);
      // Still valid — keep it
    } catch {
      // Expired or invalid — remove it
      tokenBlacklist.delete(token);
    }
  }
  console.log(`[Blacklist] Pruned. Active blacklisted tokens: ${tokenBlacklist.size}`);
}, 60 * 60 * 1000);