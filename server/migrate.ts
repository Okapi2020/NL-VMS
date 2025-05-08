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
    
    // Add new webhook settings columns
    await db.execute(sql`
      ALTER TABLE settings
      ADD COLUMN IF NOT EXISTS webhooks_enabled BOOLEAN DEFAULT FALSE NOT NULL,
      ADD COLUMN IF NOT EXISTS max_webhook_retries INTEGER DEFAULT 3 NOT NULL,
      ADD COLUMN IF NOT EXISTS sync_check_interval_minutes INTEGER DEFAULT 15 NOT NULL,
      ADD COLUMN IF NOT EXISTS enable_partial_search BOOLEAN DEFAULT TRUE NOT NULL;
    `);
    
    // Add last modified timestamp and onsite status to visitors
    await db.execute(sql`
      ALTER TABLE visitors
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      ADD COLUMN IF NOT EXISTS is_onsite BOOLEAN DEFAULT FALSE NOT NULL,
      ADD COLUMN IF NOT EXISTS last_visit_id INTEGER,
      ADD COLUMN IF NOT EXISTS external_id VARCHAR(255);
    `);
    
    // Add notification fields to visits
    await db.execute(sql`
      ALTER TABLE visits
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS external_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS sync_status VARCHAR(50) DEFAULT 'pending' NOT NULL;
    `);
    
    // Create webhooks table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS webhooks (
        id SERIAL PRIMARY KEY,
        url VARCHAR(255) NOT NULL,
        description TEXT,
        secret_key VARCHAR(255),
        events VARCHAR(255)[],
        active BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        last_called_at TIMESTAMP,
        fail_count INTEGER DEFAULT 0 NOT NULL,
        created_by_id INTEGER REFERENCES admins(id)
      );
    `);
    
    // Add triggers to update the updated_at column automatically
    await db.execute(sql`
      CREATE OR REPLACE FUNCTION update_timestamp_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Create triggers if they don't exist - need to execute each statement separately
    await db.execute(sql`DROP TRIGGER IF EXISTS visitor_updated_at_trigger ON visitors;`);
    await db.execute(sql`
      CREATE TRIGGER visitor_updated_at_trigger
      BEFORE UPDATE ON visitors
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp_column();
    `);
    
    await db.execute(sql`DROP TRIGGER IF EXISTS visit_updated_at_trigger ON visits;`);
    await db.execute(sql`
      CREATE TRIGGER visit_updated_at_trigger
      BEFORE UPDATE ON visits
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp_column();
    `);
    
    console.log("Migration completed successfully!");
    return true;
  } catch (error) {
    console.error("Migration error:", error);
    return false;
  }
}