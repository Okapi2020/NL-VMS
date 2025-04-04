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
    
    // Add 'preferred_language' column to admins table if it doesn't exist
    await db.execute(sql`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'admins' AND column_name = 'preferred_language'
        ) THEN 
          ALTER TABLE admins ADD COLUMN preferred_language VARCHAR(10) NOT NULL DEFAULT 'en';
        END IF;
      END $$;
    `);
    
    // Add 'default_language' column to settings table if it doesn't exist
    await db.execute(sql`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'settings' AND column_name = 'default_language'
        ) THEN 
          ALTER TABLE settings ADD COLUMN default_language VARCHAR(10) NOT NULL DEFAULT 'en';
        END IF;
      END $$;
    `);
    
    // Create settings table if it doesn't exist with all columns
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        app_name VARCHAR(255) NOT NULL DEFAULT 'Visitor Management System',
        header_app_name VARCHAR(255),
        footer_app_name VARCHAR(255),
        logo_url TEXT,
        country_code VARCHAR(10) NOT NULL DEFAULT '243',
        theme VARCHAR(10) NOT NULL DEFAULT 'light',
        admin_theme VARCHAR(10) NOT NULL DEFAULT 'light',
        visitor_theme VARCHAR(10) NOT NULL DEFAULT 'light',
        default_language VARCHAR(10) NOT NULL DEFAULT 'en',
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    // Create initial settings record if none exists with all fields
    await db.execute(sql`
      INSERT INTO settings (
        app_name, 
        header_app_name, 
        footer_app_name, 
        logo_url, 
        country_code, 
        theme, 
        admin_theme, 
        visitor_theme,
        default_language
      )
      SELECT 
        'Visitor Management System', 
        'Visitor Management System',
        'Visitor Management System',
        NULL, 
        '243', 
        'light', 
        'light', 
        'light',
        'en'
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