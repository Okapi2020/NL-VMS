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
  deleted: boolean("deleted").default(false).notNull(),
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
  purpose: varchar("purpose", { length: 255 }),
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
  purpose: true,
});

// Create schemas for form validation
export const visitorFormSchema = z.object({
  firstName: z.string()
    .min(2, "First name is required")
    .refine(name => /^[a-zA-Z.\-']+$/.test(name.trim()), {
      message: "Name should contain only letters and basic characters"
    }),
  middleName: z.string().optional(),
  lastName: z.string()
    .min(2, "Last name is required")
    .refine(name => /^[a-zA-Z.\-']+$/.test(name.trim()), {
      message: "Name should contain only letters and basic characters"
    }),
  yearOfBirth: z.number()
    .min(1900, "Please enter a valid year")
    .max(new Date().getFullYear(), "Year cannot be in the future"),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  phoneNumber: z.string().min(1, "Phone number is required"),
  purpose: z.string().min(1, "Purpose of visit is required").optional(),
})
.transform((data) => {
  // Combine name fields into fullName for backend compatibility
  const middleName = data.middleName ? ` ${data.middleName} ` : ' ';
  const fullName = data.firstName + middleName + data.lastName;
  return {
    ...data,
    fullName: fullName.trim()
  };
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
  purpose: z.string().optional(),
});

export type UpdateVisit = z.infer<typeof updateVisitSchema>;

// Schema for updating visitor verification status
export const updateVisitorVerificationSchema = z.object({
  id: z.number(),
  verified: z.boolean(),
});

export type UpdateVisitorVerification = z.infer<typeof updateVisitorVerificationSchema>;

export const updateVisitorSchema = z.object({
  id: z.number(),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  yearOfBirth: z.number().min(1900, "Year of birth must be after 1900").max(new Date().getFullYear(), "Year of birth cannot be in the future"),
  email: z.string().email("Invalid email format").optional().nullable(),
  phoneNumber: z.string().min(7, "Phone number must be at least 7 characters"),
});

export type UpdateVisitor = z.infer<typeof updateVisitorSchema>;
