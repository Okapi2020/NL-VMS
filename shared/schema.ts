import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Admin users schema
export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertAdminSchema = createInsertSchema(admins).pick({
  username: true,
  password: true,
});

// Visitors schema
export const visitors = pgTable("visitors", {
  id: serial("id").primaryKey(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  yearOfBirth: integer("year_of_birth").notNull(),
  email: varchar("email", { length: 255 }),
  phoneNumber: varchar("phone_number", { length: 50 }).notNull(),
  verified: boolean("verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const visitorsRelations = relations(visitors, ({ many }) => ({
  visits: many(visits),
}));

export const insertVisitorSchema = createInsertSchema(visitors).pick({
  fullName: true,
  yearOfBirth: true,
  email: true,
  phoneNumber: true,
});

// Visits schema
export const visits = pgTable("visits", {
  id: serial("id").primaryKey(),
  visitorId: integer("visitor_id").notNull(),
  checkInTime: timestamp("check_in_time").defaultNow().notNull(),
  checkOutTime: timestamp("check_out_time"),
  active: boolean("active").default(true).notNull(),
});

export const visitsRelations = relations(visits, ({ one }) => ({
  visitor: one(visitors, {
    fields: [visits.visitorId],
    references: [visitors.id],
  }),
}));

export const insertVisitSchema = createInsertSchema(visits).pick({
  visitorId: true,
});

// Create schemas for form validation
export const visitorFormSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  yearOfBirth: z.number()
    .min(1900, "Please enter a valid year")
    .max(new Date().getFullYear(), "Year cannot be in the future"),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  phoneNumber: z.string().min(1, "Phone number is required"),
});

export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;

export type Visitor = typeof visitors.$inferSelect;
export type InsertVisitor = z.infer<typeof insertVisitorSchema>;

export type Visit = typeof visits.$inferSelect;
export type InsertVisit = z.infer<typeof insertVisitSchema>;

export type VisitorFormValues = z.infer<typeof visitorFormSchema>;

// Extended types for frontend use
export type VisitorWithVisit = Visitor & {
  visit?: Visit;
};

// Schema for updating visit (check-out)
export const updateVisitSchema = z.object({
  id: z.number(),
  checkOutTime: z.date().optional(),
  active: z.boolean().optional(),
});

export type UpdateVisit = z.infer<typeof updateVisitSchema>;

// Schema for updating visitor verification status
export const updateVisitorVerificationSchema = z.object({
  id: z.number(),
  verified: z.boolean(),
});

export type UpdateVisitorVerification = z.infer<typeof updateVisitorVerificationSchema>;
