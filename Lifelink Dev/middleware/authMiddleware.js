import jwt from "jsonwebtoken";
import "dotenv/config";
import { tokenBlacklist } from "../utils/tokenBlacklist.js";

export const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"];

  if (!token) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  // Reject tokens explicitly logged out before they expired
  if (tokenBlacklist.has(token)) {
    return res.status(401).json({ message: "Session ended. Please log in again." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid or expired token." });
  }
};