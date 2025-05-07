import { db } from "./db";
import { sql } from "drizzle-orm";

export async function migrateDatabase() {
  console.log("Running database migrations...");
  
  try {
    // Add API columns to settings table if they don't exist
    await db.execute(sql`
      ALTER TABLE settings 
      ADD COLUMN IF NOT EXISTS api_key VARCHAR(255) DEFAULT 'vms-dev-api-key-2025' NOT NULL,
      ADD COLUMN IF NOT EXISTS api_enabled BOOLEAN DEFAULT FALSE NOT NULL;
    `);
    
    console.log("Migration completed successfully!");
    return true;
  } catch (error) {
    console.error("Migration error:", error);
    return false;
  }
}