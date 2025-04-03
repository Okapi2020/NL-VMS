import { admins, type Admin, type InsertAdmin } from "@shared/schema";
import { visitors, type Visitor, type InsertVisitor } from "@shared/schema";
import { visits, type Visit, type InsertVisit, type UpdateVisit } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, isNull } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { neon } from "@neondatabase/serverless";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Admin methods
  getAdmin(id: number): Promise<Admin | undefined>;
  getAdminByUsername(username: string): Promise<Admin | undefined>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;
  
  // Visitor methods
  getVisitor(id: number): Promise<Visitor | undefined>;
  getVisitorByEmail(email: string): Promise<Visitor | undefined>;
  createVisitor(visitor: InsertVisitor): Promise<Visitor>;
  getAllVisitors(): Promise<Visitor[]>;
  
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
  sessionStore: session.SessionStore;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;
  
  constructor() {
    const sql = neon(process.env.DATABASE_URL!);
    
    this.sessionStore = new PostgresSessionStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
        ssl: true,
      },
      createTableIfMissing: true,
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
  
  async createVisitor(visitor: InsertVisitor): Promise<Visitor> {
    const [createdVisitor] = await db
      .insert(visitors)
      .values(visitor)
      .returning();
    return createdVisitor;
  }
  
  async getAllVisitors(): Promise<Visitor[]> {
    return await db.select().from(visitors).orderBy(desc(visitors.id));
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
}

export const storage = new DatabaseStorage();
