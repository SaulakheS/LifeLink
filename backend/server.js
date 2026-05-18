import express from "express";
import cors from "cors";
import http from "http";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { Server } from "socket.io";
import "dotenv/config";

import pool from "./db.js";
import requestRoutes from "./routes/requests.js";
import responseRoutes from "./routes/responses.js";
import donorRoutes from "./routes/donors.js";
import authRoutes from "./routes/auth.js";
import donationRoutes from "./routes/donation.js";
import certificateRoutes from "./routes/certificates.js";
import { verifyToken } from "./middleware/authMiddleware.js";
import { startDonorResetCron, runResetNow } from "./utils/resetDonorAvailability.js";

const app = express();
const server = http.createServer(app);

// ─── SOCKET SETUP ─────────────────────────────────────────────────────────────
export const io = new Server(server, {
  cors: { origin: process.env.CLIENT_ORIGIN },
});
app.set("io", io);

// ─── SECURITY MIDDLEWARE ──────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "connect-src": ["'self'", process.env.CLIENT_ORIGIN, "ws:", "wss:"],
    },
  },
}));
app.use(cors({ origin: process.env.CLIENT_ORIGIN }));
app.use(express.json());

// Rate limit only login/register — not profile or certificates
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many requests, please try again later." },
});

// ─── ROUTES ───────────────────────────────────────────────────────────────────

// Auth — login/register rate limited
app.post("/auth/login",             authLimiter, authRoutes);
app.post("/auth/logout",            authRoutes);
app.post("/auth/register-hospital", authLimiter, authRoutes);
app.post("/auth/register-donor",    authLimiter, authRoutes);
// Hospital profile/settings — verifyToken applied inside auth.js
app.use("/auth", authRoutes);

// Certificate verify is PUBLIC — no token needed (for QR scanning etc.)
app.get("/certificates/verify/:token", certificateRoutes);

// All other routes — protected
app.use("/donors",       verifyToken, donorRoutes);
app.use("/requests",     verifyToken, requestRoutes);
app.use("/responses",    verifyToken, responseRoutes);
app.use("/donation",     verifyToken, donationRoutes);
app.use("/certificates", verifyToken, certificateRoutes);

// ─── MANUAL RESET TRIGGER (dev/admin) ─────────────────────────────────────────
app.post("/admin/reset-donors", verifyToken, async (req, res) => {
  const updated = await runResetNow();
  res.json({ message: `Reset complete. ${updated.length} donor(s) made available.`, donors: updated });
});

// ─── ROOT ─────────────────────────────────────────────────────────────────────
app.get("/", (req, res) => res.send("LifeLink Backend Running 🚀"));

// ─── SOCKET LOGIC ─────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  socket.on("join", (room) => { socket.join(room); console.log("Joined room:", room); });
  socket.on("disconnect", () => { console.log("User disconnected:", socket.id); });
});

// ─── DB TEST ──────────────────────────────────────────────────────────────────
pool.query("SELECT NOW()", (err, res) => {
  if (err) console.error("DB connection failed:", err);
  else console.log("DB Connected:", res.rows[0]);
});

// ─── START CRON ───────────────────────────────────────────────────────────────
startDonorResetCron();

// ─── START SERVER ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));