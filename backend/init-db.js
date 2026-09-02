import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDatabase() {
  console.log("Connecting to database...");
  try {
    const schemaPath = path.join(__dirname, "schema.sql");
    const sql = fs.readFileSync(schemaPath, "utf-8");

    console.log("Applying schema.sql to database...");
    await pool.query(sql);

    console.log("✅ Database initialized successfully!");
    console.log("Tables verified: hospitals, donors, emergency_requests, request_responses, donation_certificates");
  } catch (error) {
    console.error("❌ Failed to initialize database:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

initDatabase();
