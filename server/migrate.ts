import { db } from "./db";
import { sql } from "drizzle-orm";
import { seedDatabase } from "./seed";

async function migrate() {
  console.log("Running database migrations...");
  
  try {
    // Add 'deleted' column to visitors table if it doesn't exist
    await db.execute(sql`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'visitors' AND column_name = 'deleted'
        ) THEN 
          ALTER TABLE visitors ADD COLUMN deleted BOOLEAN NOT NULL DEFAULT false;
        END IF;
      END $$;
    `);
    
    // Create settings table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        app_name VARCHAR(255) NOT NULL DEFAULT 'Visitor Management System',
        logo_url TEXT,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    // Create initial settings record if none exists
    await db.execute(sql`
      INSERT INTO settings (app_name, logo_url)
      SELECT 'Visitor Management System', NULL
      WHERE NOT EXISTS (SELECT 1 FROM settings);
    `);
    
    console.log("Migration completed successfully!");
    
    // Run seed after migration is successful
    await seedDatabase();
    console.log("Initial database seed check completed");
    
  } catch (error) {
    console.error("Migration error:", error);
  }
}

// Self-executing function when this file is imported
migrate().catch(console.error);

export default migrate;