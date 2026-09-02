import express from "express";
import cors from "cors";
import http from "http";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import "dotenv/config";

import pool from "./db.js";
import requestRoutes from "./routes/requests.js";
import responseRoutes from "./routes/responses.js";
import donorRoutes from "./routes/donors.js";
import authRoutes from "./routes/auth.js";
import donationRoutes from "./routes/donation.js";
import certificateRoutes from "./routes/certificates.js";
import { verifyToken } from "./middleware/authMiddleware.js";
import { tokenBlacklist } from "./utils/tokenBlacklist.js";
import { startDonorResetCron, runResetNow } from "./utils/resetDonorAvailability.js";

const app = express();
const server = http.createServer(app);

// ─── CLIENT ORIGIN SETUP ──────────────────────────────────────────────────────
const clientOriginEnv = process.env.CLIENT_ORIGIN || process.env.FRONTEND_URL || "*";
const allowedOrigins = clientOriginEnv === "*"
  ? ["*"]
  : clientOriginEnv.split(",").map((o) => o.trim());

const socketCorsOrigin = allowedOrigins.includes("*") ? "*" : allowedOrigins;

// ─── SOCKET SETUP ─────────────────────────────────────────────────────────────
export const io = new Server(server, {
  cors: {
    origin: socketCorsOrigin,
    methods: ["GET", "POST"],
  },
});
app.set("io", io);

// ─── SOCKET AUTH MIDDLEWARE ───────────────────────────────────────────────────
// Runs BEFORE every socket connection is established.
// Client must send token in handshake: io(API_BASE, { auth: { token } })
// Any connection without a valid token is rejected immediately.
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;

  if (!token) {
    console.warn(`[Socket] ❌ Connection rejected — no token. socket=${socket.id}`);
    return next(new Error("Authentication required"));
  }

  // Reject blacklisted tokens (logged-out users)
  if (tokenBlacklist.has(token)) {
    console.warn(`[Socket] ❌ Connection rejected — blacklisted token. socket=${socket.id}`);
    return next(new Error("Session ended. Please log in again."));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Attach decoded user to socket for use in event handlers
    socket.user = decoded; // { id, role }
    next();
  } catch (err) {
    console.warn(`[Socket] ❌ Connection rejected — invalid token. socket=${socket.id}`);
    return next(new Error("Invalid or expired token"));
  }
});

// ─── SECURITY MIDDLEWARE ──────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "connect-src": ["'self'", ...allowedOrigins.filter((o) => o !== "*"), "ws:", "wss:"],
    },
  },
}));
app.use(cors({
  origin: allowedOrigins.includes("*") ? "*" : allowedOrigins,
}));
app.use(express.json());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many requests, please try again later." },
});

// ─── ROUTES ───────────────────────────────────────────────────────────────────
app.post("/auth/login",             authLimiter, authRoutes);
app.post("/auth/logout",            authRoutes);
app.post("/auth/register-hospital", authLimiter, authRoutes);
app.post("/auth/register-donor",    authLimiter, authRoutes);
app.use("/auth", authRoutes);

app.get("/certificates/verify/:token", certificateRoutes);

app.use("/donors",       verifyToken, donorRoutes);
app.use("/requests",     verifyToken, requestRoutes);
app.use("/responses",    verifyToken, responseRoutes);
app.use("/donation",     verifyToken, donationRoutes);
app.use("/certificates", verifyToken, certificateRoutes);

app.post("/admin/reset-donors", verifyToken, async (req, res) => {
  const updated = await runResetNow();
  res.json({ message: `Reset complete. ${updated.length} donor(s) made available.`, donors: updated });
});

app.get("/", (req, res) => res.send("LifeLink Backend Running 🚀"));

// ─── SOCKET LOGIC ─────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  const { id, role } = socket.user;
  console.log(`[Socket] ✅ Connected — user ${id} (${role}) socket=${socket.id}`);

  socket.on("join", (room) => {
    // ── VALIDATE ROOM ACCESS ────────────────────────────────────────────────
    // Donors can only join their own donor room
    // Hospitals can only join their own hospital room
    // No user can join a room belonging to someone else

    const allowedRoom =
      role === "user"     ? `donor_${id}`    :
      role === "hospital" ? `hospital_${id}` :
      null;

    if (!allowedRoom || room !== allowedRoom) {
      console.warn(
        `[Socket] ❌ Unauthorized room join attempt — ` +
        `user ${id} (${role}) tried to join "${room}", allowed: "${allowedRoom}"`
      );
      // Emit error back to client so frontend can handle it
      socket.emit("auth_error", { message: "Unauthorized room access" });
      return;
    }

    socket.join(room);
    console.log(`[Socket] ✅ Joined room: ${room}`);
  });

  socket.on("disconnect", (reason) => {
    console.log(`[Socket] Disconnected — user ${id} (${role}), reason: ${reason}`);
  });

  socket.on("error", (err) => {
    console.error(`[Socket] Error — user ${id}:`, err.message);
  });
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