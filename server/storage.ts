import { admins, type Admin, type InsertAdmin, type UpdateAdminLanguage } from "@shared/schema";
import { 
  visitors, 
  type Visitor, 
  type InsertVisitor, 
  type UpdateVisitorVerification,
  type UpdateVisitor
} from "@shared/schema";
import { visits, type Visit, type InsertVisit, type UpdateVisit, type UpdateVisitPartner } from "@shared/schema";
import { settings, type Settings, type UpdateSettings } from "@shared/schema";
import { systemLogs, type SystemLog, type InsertSystemLog } from "@shared/schema";
import { 
  visitorReports, 
  type VisitorReport, 
  type InsertVisitorReport, 
  type UpdateVisitorReport 
} from "@shared/schema";
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
  resetAverageVisitDuration(): Promise<boolean>;
  
  // Visitor methods
  getVisitor(id: number): Promise<Visitor | undefined>;
  getVisitorByEmail(email: string): Promise<Visitor | undefined>;
  getVisitorByPhoneNumber(phoneNumber: string): Promise<Visitor | undefined>;
  createVisitor(visitor: InsertVisitor): Promise<Visitor>;
  getAllVisitors(): Promise<Visitor[]>;
  getDeletedVisitors(): Promise<Visitor[]>;
  updateVisitorVerification(update: UpdateVisitorVerification): Promise<Visitor | undefined>;
  updateVisitor(id: number, updateData: Partial<Omit<Visitor, 'id'>>): Promise<Visitor | undefined>;
  deleteVisitor(id: number): Promise<boolean>;
  restoreVisitor(id: number): Promise<Visitor | undefined>;
  permanentlyDeleteVisitor(id: number): Promise<boolean>;
  emptyRecycleBin(): Promise<boolean>;
  incrementVisitCount(visitorId: number): Promise<Visitor | undefined>;
  
  // External API methods
  getAllVisitorsWithFilters(options: {
    page?: number;
    limit?: number;
    name?: string;
    verified?: boolean;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<Visitor[]>;
  
  getVisitorCount(options: {
    name?: string;
    verified?: boolean;
  }): Promise<number>;
  
  getCompletedVisits(options: {
    page?: number;
    limit?: number;
    dateFrom?: Date;
    dateTo?: Date;
    visitorId?: number;
  }): Promise<{visit: Visit, visitor: Visitor}[]>;
  
  getVisitorStats(dateFrom: Date, dateTo: Date): Promise<{
    totalVisits: number;
    uniqueVisitors: number;
    averageDuration: number;
    visitsByDay: Array<{date: string, count: number}>;
    visitsByPurpose: Array<{purpose: string, count: number}>;
    visitsByMunicipality: Array<{municipality: string, count: number}>;
    visitsByGender: Array<{gender: string, count: number}>;
    verifiedPercentage: number;
  }>;
  
  // Visit methods
  createVisit(visit: InsertVisit): Promise<Visit>;
  getVisit(id: number): Promise<Visit | undefined>;
  getActiveVisits(): Promise<Visit[]>;
  getVisitHistory(limit?: number): Promise<Visit[]>;
  updateVisit(visit: UpdateVisit): Promise<Visit | undefined>;
  checkOutAllActiveVisits(): Promise<number>; // Return the number of visits that were checked out
  getVisitorWithActiveVisit(visitorId: number): Promise<{ visitor: Visitor, visit: Visit } | undefined>;
  getVisitsByVisitorId(visitorId: number): Promise<Visit[]>; // Get all visits for a specific visitor
  
  // Visitor Report methods
  createVisitorReport(report: InsertVisitorReport): Promise<VisitorReport>;
  getVisitorReport(id: number): Promise<VisitorReport | undefined>;
  getVisitorReports(limit?: number): Promise<VisitorReport[]>;
  getVisitorReportsByVisitor(visitorId: number): Promise<VisitorReport[]>;
  updateVisitorReport(report: UpdateVisitorReport): Promise<VisitorReport | undefined>;
  getVisitWithVisitor(visitId: number): Promise<{ visit: Visit, visitor: Visitor } | undefined>;
  getActiveVisitsWithVisitors(): Promise<{ visit: Visit, visitor: Visitor }[]>;
  getVisitHistoryWithVisitors(limit?: number): Promise<{ visit: Visit, visitor: Visitor }[]>;
  
  // Session store
  sessionStore: session.Store;
  
  // Settings methods
  getSettings(): Promise<Settings | undefined>;
  updateSettings(settings: UpdateSettings): Promise<Settings | undefined>;
  createDefaultSettings(): Promise<Settings | undefined>;
  
  // System logs methods
  createSystemLog(log: InsertSystemLog): Promise<SystemLog>;
  getSystemLogs(limit?: number): Promise<SystemLog[]>;
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
      pruneSessionInterval: 60 * 15 // Prune invalid sessions every 15 min
      // Note: 'columns' property has been removed as it's not supported in the PGStoreOptions type
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
  
  async resetAverageVisitDuration(): Promise<boolean> {
    try {
      // Add a special flag visit that will mark when to start calculating the average
      // We'll add a visit with a specific purpose that can be identified later
      const dummyVisit = {
        visitorId: 1, // Admin user ID
        purpose: "__DURATION_RESET_MARKER__",
        active: false,
        checkInTime: new Date(),
        checkOutTime: new Date()
      };
      
      await db.insert(visits).values(dummyVisit);
      console.log("Average visit duration reset marker added successfully");
      return true;
    } catch (error) {
      console.error("Error resetting average visit duration:", error);
      return false;
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

    // First try exact match
    const [visitor] = await db.select().from(visitors).where(eq(visitors.phoneNumber, phoneNumber));
    if (visitor) return visitor;
    
    // If no exact match, try normalizing the phone number
    // Normalize phone number by removing formatting and standardizing format (handling country code)
    const normalizePhoneNumber = (phone: string): string => {
      if (!phone) return '';
      
      // Remove all non-digit characters
      let digits = phone.replace(/\D/g, '');
      
      // If it starts with country code 243, remove it
      if (digits.startsWith('243')) {
        digits = digits.substring(3);
      }
      
      // If it starts with a 0, remove it (local format)
      if (digits.startsWith('0')) {
        digits = digits.substring(1);
      }
      
      // Ensure we only have 9 digits (standard mobile number length without prefix)
      if (digits.length > 9) {
        digits = digits.substring(digits.length - 9);
      }
      
      // Return just the base number without country code or leading zero
      return digits;
    };
    
    // Normalize the search phone number
    const normalizedSearchPhone = normalizePhoneNumber(phoneNumber);
    
    // If the normalized phone number is too short (less than 9 digits), don't search
    if (normalizedSearchPhone.length < 9) {
      console.log("Phone number too short for normalized search:", phoneNumber);
      return undefined;
    }
    
    // Get all visitors and filter by normalized phone number
    const allVisitors = await db.select().from(visitors);
    
    // Find a match by normalized phone number
    const matchedVisitor = allVisitors.find(v => 
      normalizePhoneNumber(v.phoneNumber) === normalizedSearchPhone
    );
    
    return matchedVisitor;
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
  
  async updateVisitor(id: number, updateData: Partial<Omit<Visitor, 'id'>>): Promise<Visitor | undefined> {
    const [updatedVisitor] = await db
      .update(visitors)
      .set(updateData)
      .where(eq(visitors.id, id))
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
  
  async incrementVisitCount(visitorId: number): Promise<Visitor | undefined> {
    try {
      const [updatedVisitor] = await db
        .update(visitors)
        .set({ visitCount: sql`${visitors.visitCount} + 1` })
        .where(eq(visitors.id, visitorId))
        .returning();
      return updatedVisitor;
    } catch (error) {
      console.error("Error incrementing visit count:", error);
      return undefined;
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
  
  // Partner Tracking feature: update the partner association of a visit
  async updateVisitPartner(updateData: UpdateVisitPartner): Promise<boolean> {
    try {
      const { visitId, partnerId } = updateData;
      
      // Update the current visit with the partner ID (without transaction)
      await db
        .update(visits)
        .set({ partnerId: partnerId })
        .where(eq(visits.id, visitId));
      
      if (partnerId) {
        // Update the partner visit to point back to this visit (bidirectional)
        await db
          .update(visits)
          .set({ partnerId: visitId })
          .where(eq(visits.id, partnerId));
      } else {
        // If removing partner, find any visits that had this as a partner and clear them
        const [visit] = await db
          .select()
          .from(visits)
          .where(eq(visits.partnerId, visitId));
        
        if (visit) {
          await db
            .update(visits)
            .set({ partnerId: null })
            .where(eq(visits.id, visit.id));
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Error updating partner for visit ID ${updateData.visitId}:`, error);
      return false;
    }
  }
  
  // Partner Tracking feature: get the partner visit and visitor details
  async getVisitPartner(visitId: number): Promise<{ visit: Visit; visitor: Visitor } | undefined> {
    try {
      // First, get the visit to find partnerId
      const [visit] = await db
        .select()
        .from(visits)
        .where(eq(visits.id, visitId));
      
      if (!visit || !visit.partnerId) {
        return undefined;
      }
      
      // Get the partner visit with visitor
      return await this.getVisitWithVisitor(visit.partnerId);
    } catch (error) {
      console.error(`Error fetching partner for visit ID ${visitId}:`, error);
      return undefined;
    }
  }
  
  async checkOutAllActiveVisits(): Promise<number> {
    try {
      // Get the current date/time for checkout
      const checkOutTime = new Date();
      
      // Update all active visits to be inactive with current checkout time
      const result = await db
        .update(visits)
        .set({
          active: false,
          checkOutTime: checkOutTime
        })
        .where(eq(visits.active, true))
        .returning();
      
      // Return the number of visits that were checked out
      console.log(`Auto-checkout completed: ${result.length} active visits were checked out at ${checkOutTime.toISOString()}`);
      return result.length;
    } catch (error) {
      console.error("Error during automatic checkout:", error);
      return 0;
    }
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
    
    // Create a Set to track unique visitor-visit combinations to prevent duplicates
    const visitedPairs = new Set<string>();
    
    for (const visit of activeVisits) {
      const visitor = await this.getVisitor(visit.visitorId);
      if (visitor) {
        // Create a unique key for this visitor-visit pair
        const pairKey = `${visitor.id}-${visit.id}`;
        
        // Only add this pair if we haven't seen it before
        if (!visitedPairs.has(pairKey)) {
          visitedPairs.add(pairKey);
          result.push({ visit, visitor });
        }
      }
    }
    
    return result;
  }
  
  async getVisitsByVisitorId(visitorId: number): Promise<Visit[]> {
    return await db
      .select()
      .from(visits)
      .where(eq(visits.visitorId, visitorId))
      .orderBy(desc(visits.checkInTime));
  }
  
  async getVisitHistoryWithVisitors(limit: number = 100): Promise<{ visit: Visit, visitor: Visitor }[]> {
    const visitHistory = await this.getVisitHistory(limit);
    const result: { visit: Visit, visitor: Visitor }[] = [];
    
    // Create a Set to track unique visitor-visit combinations to prevent duplicates
    const visitedPairs = new Set<string>();
    
    for (const visit of visitHistory) {
      const visitor = await this.getVisitor(visit.visitorId);
      if (visitor) {
        // Create a unique key for this visitor-visit pair
        const pairKey = `${visitor.id}-${visit.id}`;
        
        // Only add this pair if we haven't seen it before
        if (!visitedPairs.has(pairKey)) {
          visitedPairs.add(pairKey);
          result.push({ visit, visitor });
        }
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
          // Set API settings if provided or keep existing ones
          apiKey: updateData.apiKey || existingSettings.apiKey,
          apiEnabled: updateData.apiEnabled !== undefined ? updateData.apiEnabled : existingSettings.apiEnabled,
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
          apiKey: customSettings?.apiKey || "vms-dev-api-key-2025", // Default API key
          apiEnabled: customSettings?.apiEnabled !== undefined ? customSettings.apiEnabled : false, // Default to disabled
        })
        .returning();
      
      console.log("Default settings created successfully");
      return createdSettings;
    } catch (error) {
      console.error("Error creating default settings:", error);
      return undefined;
    }
  }
  
  // System logs methods
  async createSystemLog(log: InsertSystemLog): Promise<SystemLog> {
    try {
      const [createdLog] = await db
        .insert(systemLogs)
        .values(log)
        .returning();
      return createdLog;
    } catch (error) {
      console.error("Error creating system log:", error);
      // Create a fallback log object in case of DB error
      return {
        id: -1,
        action: log.action,
        details: log.details,
        userId: log.userId || null,
        affectedRecords: log.affectedRecords || 0,
        timestamp: new Date()
      };
    }
  }
  
  async getSystemLogs(limit: number = 100): Promise<SystemLog[]> {
    try {
      return await db
        .select()
        .from(systemLogs)
        .orderBy(desc(systemLogs.timestamp))
        .limit(limit);
    } catch (error) {
      console.error("Error fetching system logs:", error);
      return [];
    }
  }

  // Visitor Report methods
  async createVisitorReport(report: InsertVisitorReport): Promise<VisitorReport> {
    try {
      const [createdReport] = await db
        .insert(visitorReports)
        .values(report)
        .returning();
      return createdReport;
    } catch (error) {
      console.error("Error creating visitor report:", error);
      throw error;
    }
  }

  async getVisitorReport(id: number): Promise<VisitorReport | undefined> {
    try {
      const [report] = await db
        .select()
        .from(visitorReports)
        .where(eq(visitorReports.id, id));
      return report;
    } catch (error) {
      console.error("Error fetching visitor report:", error);
      return undefined;
    }
  }

  async getVisitorReports(limit: number = 100): Promise<VisitorReport[]> {
    try {
      return await db
        .select()
        .from(visitorReports)
        .orderBy(desc(visitorReports.createdAt))
        .limit(limit);
    } catch (error) {
      console.error("Error fetching visitor reports:", error);
      return [];
    }
  }

  async getVisitorReportsByVisitor(visitorId: number): Promise<VisitorReport[]> {
    try {
      return await db
        .select()
        .from(visitorReports)
        .where(eq(visitorReports.visitorId, visitorId))
        .orderBy(desc(visitorReports.createdAt));
    } catch (error) {
      console.error("Error fetching visitor reports by visitor:", error);
      return [];
    }
  }

  async updateVisitorReport(report: UpdateVisitorReport): Promise<VisitorReport | undefined> {
    try {
      const updateData: any = {
        status: report.status
      };
      
      if (report.resolutionNotes !== undefined) {
        updateData.resolutionNotes = report.resolutionNotes;
      }
      
      if (report.status === "Resolved" && !report.resolutionDate) {
        updateData.resolutionDate = new Date();
      } else if (report.resolutionDate) {
        updateData.resolutionDate = report.resolutionDate;
      }
      
      const [updatedReport] = await db
        .update(visitorReports)
        .set(updateData)
        .where(eq(visitorReports.id, report.id))
        .returning();
        
      return updatedReport;
    } catch (error) {
      console.error("Error updating visitor report:", error);
      return undefined;
    }
  }
  
  // External API methods
  async getAllVisitorsWithFilters(options: {
    page?: number;
    limit?: number;
    name?: string;
    verified?: boolean;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<Visitor[]> {
    try {
      const {
        page = 1,
        limit = 100,
        name,
        verified,
        sortBy = 'id',
        sortOrder = 'desc'
      } = options;
      
      // Calculate offset for pagination
      const offset = (page - 1) * limit;
      
      // Start building the query
      let query = db
        .select()
        .from(visitors)
        .where(eq(visitors.deleted, false));
      
      // Add name filter if provided
      if (name) {
        query = query.where(sql`${visitors.fullName} ILIKE ${`%${name}%`}`);
      }
      
      // Add verified filter if provided
      if (verified !== undefined) {
        query = query.where(eq(visitors.verified, verified));
      }
      
      // Add sorting
      if (sortBy && sortOrder) {
        // Handle different sort fields
        if (sortBy === 'id' && sortOrder === 'desc') {
          query = query.orderBy(desc(visitors.id));
        } else if (sortBy === 'id') {
          query = query.orderBy(visitors.id);
        } else if (sortBy === 'name' && sortOrder === 'desc') {
          query = query.orderBy(desc(visitors.fullName));
        } else if (sortBy === 'name') {
          query = query.orderBy(visitors.fullName);
        } else if (sortBy === 'visits' && sortOrder === 'desc') {
          query = query.orderBy(desc(visitors.visitCount));
        } else if (sortBy === 'visits') {
          query = query.orderBy(visitors.visitCount);
        }
      }
      
      // Add pagination
      query = query.limit(limit).offset(offset);
      
      // Execute the query
      return await query;
    } catch (error) {
      console.error("Error getting filtered visitors:", error);
      return [];
    }
  }
  
  async getVisitorCount(options: {
    name?: string;
    verified?: boolean;
  }): Promise<number> {
    try {
      const { name, verified } = options;
      
      // Start building the query
      let query = db
        .select({ count: sql<number>`count(*)` })
        .from(visitors)
        .where(eq(visitors.deleted, false));
      
      // Add name filter if provided
      if (name) {
        query = query.where(sql`${visitors.fullName} ILIKE ${`%${name}%`}`);
      }
      
      // Add verified filter if provided
      if (verified !== undefined) {
        query = query.where(eq(visitors.verified, verified));
      }
      
      // Execute the query
      const [result] = await query;
      return result?.count || 0;
    } catch (error) {
      console.error("Error getting visitor count:", error);
      return 0;
    }
  }
  
  async getVisitorById(id: number): Promise<Visitor | undefined> {
    // This is an alias for getVisitor to match API naming convention
    return this.getVisitor(id);
  }
  
  async getCompletedVisits(options: {
    page?: number;
    limit?: number;
    dateFrom?: Date;
    dateTo?: Date;
    visitorId?: number;
  }): Promise<{visit: Visit, visitor: Visitor}[]> {
    try {
      const {
        page = 1,
        limit = 100,
        dateFrom,
        dateTo,
        visitorId
      } = options;
      
      // Calculate offset for pagination
      const offset = (page - 1) * limit;
      
      // Build the base query for completed visits
      let visitsQuery = db
        .select()
        .from(visits)
        .where(eq(visits.active, false));
      
      // Add date range filter if provided
      if (dateFrom) {
        visitsQuery = visitsQuery.where(sql`${visits.checkInTime} >= ${dateFrom}`);
      }
      
      if (dateTo) {
        visitsQuery = visitsQuery.where(sql`${visits.checkInTime} <= ${dateTo}`);
      }
      
      // Add visitor filter if provided
      if (visitorId) {
        visitsQuery = visitsQuery.where(eq(visits.visitorId, visitorId));
      }
      
      // Add order by and pagination
      visitsQuery = visitsQuery
        .orderBy(desc(visits.checkInTime))
        .limit(limit)
        .offset(offset);
      
      // Get the visits
      const completedVisits = await visitsQuery;
      
      // If no visits, return empty array
      if (completedVisits.length === 0) {
        return [];
      }
      
      // Get all visitor IDs from the visits
      const visitorIds = completedVisits.map(visit => visit.visitorId);
      
      // Get all visitors in one query
      const allVisitors = await db
        .select()
        .from(visitors)
        .where(sql`${visitors.id} IN (${visitorIds.join(',')})`);
      
      // Create a map of visitor ID to visitor object for quick lookup
      const visitorMap = new Map<number, Visitor>();
      allVisitors.forEach(visitor => {
        visitorMap.set(visitor.id, visitor);
      });
      
      // Combine visits with their visitors
      return completedVisits.map(visit => ({
        visit,
        visitor: visitorMap.get(visit.visitorId)!
      }));
    } catch (error) {
      console.error("Error getting completed visits:", error);
      return [];
    }
  }
  
  async getVisitorStats(dateFrom: Date, dateTo: Date): Promise<{
    totalVisits: number;
    uniqueVisitors: number;
    averageDuration: number;
    visitsByDay: Array<{date: string, count: number}>;
    visitsByPurpose: Array<{purpose: string, count: number}>;
    visitsByMunicipality: Array<{municipality: string, count: number}>;
    visitsByGender: Array<{gender: string, count: number}>;
    verifiedPercentage: number;
  }> {
    try {
      // Get all visits within the date range
      const allVisits = await db
        .select()
        .from(visits)
        .where(
          and(
            sql`${visits.checkInTime} >= ${dateFrom}`,
            sql`${visits.checkInTime} <= ${dateTo}`
          )
        );
      
      // Get total visits
      const totalVisits = allVisits.length;
      
      // Get unique visitor IDs
      const uniqueVisitorIds = new Set(allVisits.map(visit => visit.visitorId));
      const uniqueVisitors = uniqueVisitorIds.size;
      
      // Calculate average duration for visits that have been checked out
      const completedVisits = allVisits.filter(visit => visit.checkOutTime);
      let totalDurationMs = 0;
      
      completedVisits.forEach(visit => {
        if (visit.checkOutTime && visit.checkInTime) {
          const duration = new Date(visit.checkOutTime).getTime() - new Date(visit.checkInTime).getTime();
          totalDurationMs += duration;
        }
      });
      
      const averageDuration = completedVisits.length > 0 
        ? Math.floor(totalDurationMs / completedVisits.length / 60000) // in minutes
        : 0;
      
      // Get visits by day
      const visitsByDayMap = new Map<string, number>();
      allVisits.forEach(visit => {
        const dateStr = new Date(visit.checkInTime).toISOString().split('T')[0];
        visitsByDayMap.set(dateStr, (visitsByDayMap.get(dateStr) || 0) + 1);
      });
      
      const visitsByDay = Array.from(visitsByDayMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
      
      // Get all visitors for further analysis
      const visitorIds = Array.from(uniqueVisitorIds);
      const allVisitors = await db
        .select()
        .from(visitors)
        .where(sql`${visitors.id} IN (${visitorIds.join(',')})`);
      
      // Count by purpose
      const purposeCount = new Map<string, number>();
      allVisits.forEach(visit => {
        const purpose = visit.purpose || 'Not specified';
        purposeCount.set(purpose, (purposeCount.get(purpose) || 0) + 1);
      });
      
      const visitsByPurpose = Array.from(purposeCount.entries())
        .map(([purpose, count]) => ({ purpose, count }))
        .sort((a, b) => b.count - a.count);
      
      // Count by municipality
      const municipalityCount = new Map<string, number>();
      allVisitors.forEach(visitor => {
        const municipality = visitor.municipality || 'Not specified';
        municipalityCount.set(municipality, (municipalityCount.get(municipality) || 0) + 1);
      });
      
      const visitsByMunicipality = Array.from(municipalityCount.entries())
        .map(([municipality, count]) => ({ municipality, count }))
        .sort((a, b) => b.count - a.count);
      
      // Count by gender
      const genderCount = new Map<string, number>();
      allVisitors.forEach(visitor => {
        const gender = visitor.sex || 'Not specified';
        genderCount.set(gender, (genderCount.get(gender) || 0) + 1);
      });
      
      const visitsByGender = Array.from(genderCount.entries())
        .map(([gender, count]) => ({ gender, count }))
        .sort((a, b) => b.count - a.count);
      
      // Calculate verified percentage
      const verifiedCount = allVisitors.filter(visitor => visitor.verified).length;
      const verifiedPercentage = allVisitors.length > 0 
        ? Math.round((verifiedCount / allVisitors.length) * 100) 
        : 0;
      
      return {
        totalVisits,
        uniqueVisitors,
        averageDuration,
        visitsByDay,
        visitsByPurpose,
        visitsByMunicipality,
        visitsByGender,
        verifiedPercentage
      };
    } catch (error) {
      console.error("Error getting visitor stats:", error);
      return {
        totalVisits: 0,
        uniqueVisitors: 0,
        averageDuration: 0,
        visitsByDay: [],
        visitsByPurpose: [],
        visitsByMunicipality: [],
        visitsByGender: [],
        verifiedPercentage: 0
      };
    }
  }
}

export const storage = new DatabaseStorage();
