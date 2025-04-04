import { admins, type Admin, type InsertAdmin, type UpdateAdminLanguage } from "@shared/schema";
import { 
  visitors, 
  type Visitor, 
  type InsertVisitor, 
  type UpdateVisitorVerification,
  type UpdateVisitor
} from "@shared/schema";
import { visits, type Visit, type InsertVisit, type UpdateVisit } from "@shared/schema";
import { settings, type Settings, type UpdateSettings } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, isNull } from "drizzle-orm";
import { sql } from "drizzle-orm/sql/sql";
import session from "express-session";
type SessionStore = session.Store;
import connectPg from "connect-pg-simple";
import { neon } from "@neondatabase/serverless";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Admin methods
  getAdmin(id: number): Promise<Admin | undefined>;
  getAdminByUsername(username: string): Promise<Admin | undefined>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;
  updateAdminLanguage(update: UpdateAdminLanguage): Promise<Admin | undefined>;
  
  // Visitor methods
  getVisitor(id: number): Promise<Visitor | undefined>;
  getVisitorByEmail(email: string): Promise<Visitor | undefined>;
  getVisitorByPhoneNumber(phoneNumber: string): Promise<Visitor | undefined>;
  createVisitor(visitor: InsertVisitor): Promise<Visitor>;
  getAllVisitors(): Promise<Visitor[]>;
  getDeletedVisitors(): Promise<Visitor[]>;
  updateVisitorVerification(update: UpdateVisitorVerification): Promise<Visitor | undefined>;
  updateVisitor(visitor: UpdateVisitor): Promise<Visitor | undefined>;
  deleteVisitor(id: number): Promise<boolean>;
  restoreVisitor(id: number): Promise<Visitor | undefined>;
  permanentlyDeleteVisitor(id: number): Promise<boolean>;
  emptyRecycleBin(): Promise<boolean>;
  
  // Visit methods
  createVisit(visit: InsertVisit): Promise<Visit>;
  getVisit(id: number): Promise<Visit | undefined>;
  getActiveVisits(): Promise<Visit[]>;
  getVisitHistory(limit?: number): Promise<Visit[]>;
  updateVisit(visit: UpdateVisit): Promise<Visit | undefined>;
  getVisitorWithActiveVisit(visitorId: number): Promise<{ visitor: Visitor, visit: Visit } | undefined>;
  getVisitWithVisitor(visitId: number): Promise<{ visit: Visit, visitor: Visitor } | undefined>;
  getActiveVisitsWithVisitors(): Promise<{ visit: Visit, visitor: Visitor }[]>;
  getVisitHistoryWithVisitors(limit?: number): Promise<{ visit: Visit, visitor: Visitor }[]>;
  
  // Session store
  sessionStore: session.Store;
  
  // Settings methods
  getSettings(): Promise<Settings | undefined>;
  updateSettings(settings: UpdateSettings): Promise<Settings | undefined>;
  createDefaultSettings(): Promise<Settings | undefined>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  
  constructor() {
    const sql = neon(process.env.DATABASE_URL!);
    
    this.sessionStore = new PostgresSessionStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
        ssl: true,
      },
      createTableIfMissing: true,
      tableName: 'session', // Explicitly name the session table
      pruneSessionInterval: 60 * 15, // Prune invalid sessions every 15 min
      // Customize session columns if needed
      columns: {
        session_id: 'sid',
        session_data: 'sess',
        expire: 'expire'
      }
    });
  }
  
  // Admin methods
  async getAdmin(id: number): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.id, id));
    return admin;
  }

  async getAdminByUsername(username: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.username, username));
    return admin;
  }

  async createAdmin(admin: InsertAdmin): Promise<Admin> {
    const [createdAdmin] = await db
      .insert(admins)
      .values(admin)
      .returning();
    return createdAdmin;
  }
  
  async updateAdminLanguage(update: UpdateAdminLanguage): Promise<Admin | undefined> {
    try {
      const [updatedAdmin] = await db
        .update(admins)
        .set({ preferredLanguage: update.preferredLanguage })
        .where(eq(admins.id, update.id))
        .returning();
      return updatedAdmin;
    } catch (error) {
      console.error("Error updating admin language preference:", error);
      return undefined;
    }
  }
  
  // Visitor methods
  async getVisitor(id: number): Promise<Visitor | undefined> {
    const [visitor] = await db.select().from(visitors).where(eq(visitors.id, id));
    return visitor;
  }
  
  async getVisitorByEmail(email: string): Promise<Visitor | undefined> {
    if (!email) return undefined;
    const [visitor] = await db.select().from(visitors).where(eq(visitors.email, email));
    return visitor;
  }
  
  async getVisitorByPhoneNumber(phoneNumber: string): Promise<Visitor | undefined> {
    if (!phoneNumber) return undefined;
    const [visitor] = await db.select().from(visitors).where(eq(visitors.phoneNumber, phoneNumber));
    return visitor;
  }
  
  async createVisitor(visitor: InsertVisitor): Promise<Visitor> {
    const [createdVisitor] = await db
      .insert(visitors)
      .values(visitor)
      .returning();
    return createdVisitor;
  }
  
  async getAllVisitors(): Promise<Visitor[]> {
    return await db
      .select()
      .from(visitors)
      .where(eq(visitors.deleted, false))
      .orderBy(desc(visitors.id));
  }
  
  async getDeletedVisitors(): Promise<Visitor[]> {
    return await db
      .select()
      .from(visitors)
      .where(eq(visitors.deleted, true))
      .orderBy(desc(visitors.id));
  }
  
  async updateVisitorVerification(update: UpdateVisitorVerification): Promise<Visitor | undefined> {
    const [updatedVisitor] = await db
      .update(visitors)
      .set({ verified: update.verified })
      .where(eq(visitors.id, update.id))
      .returning();
    return updatedVisitor;
  }
  
  async updateVisitor(visitor: UpdateVisitor): Promise<Visitor | undefined> {
    const [updatedVisitor] = await db
      .update(visitors)
      .set({
        fullName: visitor.fullName,
        yearOfBirth: visitor.yearOfBirth,
        email: visitor.email,
        phoneNumber: visitor.phoneNumber
      })
      .where(eq(visitors.id, visitor.id))
      .returning();
    return updatedVisitor;
  }
  
  async deleteVisitor(id: number): Promise<boolean> {
    try {
      // First check for any active visits
      const activeVisits = await db
        .select()
        .from(visits)
        .where(
          and(
            eq(visits.visitorId, id),
            eq(visits.active, true)
          )
        );
      
      if (activeVisits.length > 0) {
        // Cannot delete visitor with active visits
        return false;
      }
      
      // Soft delete the visitor by setting the deleted flag
      const deleted = await db
        .update(visitors)
        .set({ deleted: true })
        .where(eq(visitors.id, id))
        .returning();
      
      return deleted.length > 0;
    } catch (error) {
      console.error("Error deleting visitor:", error);
      return false;
    }
  }
  
  async restoreVisitor(id: number): Promise<Visitor | undefined> {
    try {
      // Restore the visitor by setting the deleted flag to false
      const [restoredVisitor] = await db
        .update(visitors)
        .set({ deleted: false })
        .where(eq(visitors.id, id))
        .returning();
      
      return restoredVisitor;
    } catch (error) {
      console.error("Error restoring visitor:", error);
      return undefined;
    }
  }
  
  async permanentlyDeleteVisitor(id: number): Promise<boolean> {
    try {
      // First delete all related visits
      await db.delete(visits).where(eq(visits.visitorId, id));
      
      // Then delete the visitor
      await db.delete(visitors).where(eq(visitors.id, id));
      return true;
    } catch (error) {
      console.error("Error permanently deleting visitor:", error);
      return false;
    }
  }

  async emptyRecycleBin(): Promise<boolean> {
    try {
      // Get all deleted visitors
      const deletedVisitors = await this.getDeletedVisitors();
      
      // Delete all their visits and then the visitors
      for (const visitor of deletedVisitors) {
        await this.permanentlyDeleteVisitor(visitor.id);
      }
      
      return true;
    } catch (error) {
      console.error("Error emptying recycle bin:", error);
      return false;
    }
  }
  
  // Visit methods
  async createVisit(visit: InsertVisit): Promise<Visit> {
    const [createdVisit] = await db
      .insert(visits)
      .values(visit)
      .returning();
    return createdVisit;
  }
  
  async getVisit(id: number): Promise<Visit | undefined> {
    const [visit] = await db.select().from(visits).where(eq(visits.id, id));
    return visit;
  }
  
  async getActiveVisits(): Promise<Visit[]> {
    return await db
      .select()
      .from(visits)
      .where(eq(visits.active, true))
      .orderBy(desc(visits.checkInTime));
  }
  
  async getVisitHistory(limit: number = 100): Promise<Visit[]> {
    return await db
      .select()
      .from(visits)
      .where(eq(visits.active, false))
      .orderBy(desc(visits.checkInTime))
      .limit(limit);
  }
  
  async updateVisit(updateVisit: UpdateVisit): Promise<Visit | undefined> {
    const [updatedVisit] = await db
      .update(visits)
      .set(updateVisit)
      .where(eq(visits.id, updateVisit.id))
      .returning();
    return updatedVisit;
  }
  
  async getVisitorWithActiveVisit(visitorId: number): Promise<{ visitor: Visitor, visit: Visit } | undefined> {
    const visitor = await this.getVisitor(visitorId);
    if (!visitor) return undefined;
    
    const [activeVisit] = await db
      .select()
      .from(visits)
      .where(
        and(
          eq(visits.visitorId, visitorId),
          eq(visits.active, true)
        )
      );
    
    if (!activeVisit) return undefined;
    
    return { visitor, visit: activeVisit };
  }
  
  async getVisitWithVisitor(visitId: number): Promise<{ visit: Visit, visitor: Visitor } | undefined> {
    const [visit] = await db
      .select()
      .from(visits)
      .where(eq(visits.id, visitId));
    
    if (!visit) return undefined;
    
    const visitor = await this.getVisitor(visit.visitorId);
    if (!visitor) return undefined;
    
    return { visit, visitor };
  }
  
  async getActiveVisitsWithVisitors(): Promise<{ visit: Visit, visitor: Visitor }[]> {
    const activeVisits = await this.getActiveVisits();
    const result: { visit: Visit, visitor: Visitor }[] = [];
    
    for (const visit of activeVisits) {
      const visitor = await this.getVisitor(visit.visitorId);
      if (visitor) {
        result.push({ visit, visitor });
      }
    }
    
    return result;
  }
  
  async getVisitHistoryWithVisitors(limit: number = 100): Promise<{ visit: Visit, visitor: Visitor }[]> {
    const visitHistory = await this.getVisitHistory(limit);
    const result: { visit: Visit, visitor: Visitor }[] = [];
    
    for (const visit of visitHistory) {
      const visitor = await this.getVisitor(visit.visitorId);
      if (visitor) {
        result.push({ visit, visitor });
      }
    }
    
    return result;
  }

  // Settings methods
  async getSettings(): Promise<Settings | undefined> {
    try {
      // Get the first settings record or undefined if none exist
      const [settingsRecord] = await db.select().from(settings);
      return settingsRecord;
    } catch (error) {
      console.error("Error fetching settings:", error);
      // If the table doesn't exist yet, we'll return undefined
      if (error instanceof Error && error.message.includes("relation") && error.message.includes("does not exist")) {
        console.log("Settings table doesn't exist yet. Will be created.");
      }
      return undefined;
    }
  }

  async updateSettings(updateData: UpdateSettings): Promise<Settings | undefined> {
    try {
      // Check if settings table exists, if not, attempt to create it
      try {
        // First check if settings exist
        const existingSettings = await this.getSettings();
        
        if (!existingSettings) {
          // If no settings exist, create them
          return this.createDefaultSettings(updateData);
        }
        
        // Update existing settings
        // Ensure backward compatibility by also updating the theme field
        const dataToUpdate = { 
          ...updateData, 
          // If theme is not provided but one of the new fields is, use that
          theme: updateData.theme || updateData.adminTheme || existingSettings.theme,
          // Set header and footer app names if not provided
          headerAppName: updateData.headerAppName || existingSettings.headerAppName || updateData.appName || existingSettings.appName,
          footerAppName: updateData.footerAppName || existingSettings.footerAppName || updateData.appName || existingSettings.appName,
          // Set defaultLanguage if not provided
          defaultLanguage: updateData.defaultLanguage || existingSettings.defaultLanguage,
          updatedAt: new Date() 
        };
        
        const [updatedSettings] = await db
          .update(settings)
          .set(dataToUpdate)
          .where(eq(settings.id, existingSettings.id))
          .returning();
        
        return updatedSettings;
      } catch (innerError) {
        // If the table doesn't exist, create it and then try again
        if (innerError instanceof Error && innerError.message.includes("relation") && innerError.message.includes("does not exist")) {
          console.log("Attempting to create settings table...");
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
          // Now try to create default settings
          return this.createDefaultSettings(updateData);
        } else {
          throw innerError; // Re-throw if it's another type of error
        }
      }
    } catch (error) {
      console.error("Error updating settings:", error);
      return undefined;
    }
  }

  async createDefaultSettings(customSettings?: UpdateSettings): Promise<Settings | undefined> {
    try {
      // Create default settings
      const themeValue = customSettings?.theme || "light";
      
      const [createdSettings] = await db
        .insert(settings)
        .values({
          appName: customSettings?.appName || "Visitor Management System",
          headerAppName: customSettings?.headerAppName || customSettings?.appName || "Visitor Management System",
          footerAppName: customSettings?.footerAppName || customSettings?.appName || "Visitor Management System",
          logoUrl: customSettings?.logoUrl || null,
          countryCode: customSettings?.countryCode || "243", // Default country code
          theme: themeValue, // Default theme (legacy)
          adminTheme: customSettings?.adminTheme || themeValue, // Admin theme
          visitorTheme: customSettings?.visitorTheme || themeValue, // Visitor theme
          defaultLanguage: customSettings?.defaultLanguage || "en", // Default language
        })
        .returning();
      
      console.log("Default settings created successfully");
      return createdSettings;
    } catch (error) {
      console.error("Error creating default settings:", error);
      return undefined;
    }
  }
}

export const storage = new DatabaseStorage();
