import { db } from "./db";
import { sql } from "drizzle-orm";

async function migrateSystemLogs() {
  try {
    console.log("Creating system_logs table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS system_logs (
        id SERIAL PRIMARY KEY,
        action TEXT NOT NULL,
        details TEXT NOT NULL,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
        user_id INTEGER,
        affected_records INTEGER
      );
    `);
    console.log("System logs table created successfully");
  } catch (error) {
    console.error("Error creating system_logs table:", error);
  }
}

// Self-executing async function
(async () => {
  await migrateSystemLogs();
  process.exit(0);
})();