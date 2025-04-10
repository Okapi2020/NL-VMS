import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Admin users schema
export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  preferredLanguage: varchar("preferred_language", { length: 10 }).default("en").notNull(),
});

export const insertAdminSchema = createInsertSchema(admins).pick({
  username: true,
  password: true,
  preferredLanguage: true,
});

// Visitors schema
export const visitors = pgTable("visitors", {
  id: serial("id").primaryKey(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  yearOfBirth: integer("year_of_birth").notNull(),
  sex: varchar("sex", { length: 20 }).notNull(),
  email: varchar("email", { length: 255 }),
  phoneNumber: varchar("phone_number", { length: 50 }).notNull(),
  municipality: varchar("municipality", { length: 100 }),
  verified: boolean("verified").default(false).notNull(),
  deleted: boolean("deleted").default(false).notNull(),
  visitCount: integer("visit_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const visitorsRelations = relations(visitors, ({ many }) => ({
  visits: many(visits),
}));

export const insertVisitorSchema = createInsertSchema(visitors).pick({
  fullName: true,
  yearOfBirth: true,
  sex: true,
  email: true,
  phoneNumber: true,
  municipality: true,
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
    .refine(name => /^[a-zA-ZÀ-ÖØ-öø-ÿ.\-']+$/.test(name.trim()), {
      message: "Name should contain only letters and basic characters"
    })
    .refine(name => !name.trim().includes(' '), {
      message: "First name should not contain spaces (enter only one name)"
    }),
  middleName: z.string()
    .optional()
    .transform(val => (!val || val.trim() === '') ? undefined : val)
    .refine(name => !name || /^[a-zA-ZÀ-ÖØ-öø-ÿ.\-']+$/.test(name.trim()), {
      message: "Name should contain only letters and basic characters"
    })
    .refine(name => !name || !name.trim().includes(' '), {
      message: "Middle name should not contain spaces (enter only one name)"
    }),
  lastName: z.string()
    .min(2, "Last name is required")
    .refine(name => /^[a-zA-ZÀ-ÖØ-öø-ÿ.\-']+$/.test(name.trim()), {
      message: "Name should contain only letters and basic characters"
    })
    .refine(name => !name.trim().includes(' '), {
      message: "Last name should not contain spaces (enter only one name)"
    }),
  yearOfBirth: z.number()
    .min(1900, "Please enter a valid year")
    .max(new Date().getFullYear(), "Year cannot be in the future"),
  sex: z.enum(["Masculin", "Feminin"], {
    errorMap: () => ({ message: "Please select either Masculin or Feminin" }),
  }),
  municipality: z.string().min(1, "Municipality selection is required"),
  email: z.string()
    .email("Please enter a valid email address")
    .refine(email => email === "" || /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email), {
      message: "Please enter a valid email address with proper format (e.g., name@example.com)"
    })
    .optional()
    .or(z.literal("")),
  phoneNumber: z.string()
    .min(1, "Phone number is required")
    .refine(
      phone => {
        // Remove all non-digit characters for validation
        const digits = phone.replace(/\D/g, '');
        // Phone should have exactly 10 digits
        return digits.length === 10;
      },
      {
        message: "Phone number must be exactly 10 digits"
      }
    ),
  purpose: z.string().min(1, "Purpose of visit is required").optional(),
})
.transform((data) => {
  // Combine name fields into fullName for backend compatibility
  const middleName = data.middleName ? ` ${data.middleName} ` : ' ';
  const fullName = data.firstName + middleName + data.lastName;
  
  // Normalize phone number to remove any non-digit characters
  let phoneNumber = data.phoneNumber.replace(/\D/g, '');
  
  // Remove leading zero if present (for country code format)
  if (phoneNumber.startsWith('0')) {
    phoneNumber = phoneNumber.substring(1);
  }
  
  return {
    ...data,
    fullName: fullName.trim(),
    phoneNumber: phoneNumber,
    municipality: data.municipality || undefined // Ensure municipality is properly passed or set as undefined
  };
});

// Schema for updating admin language preference
export const updateAdminLanguageSchema = z.object({
  id: z.number(),
  preferredLanguage: z.enum(["en", "fr"], {
    errorMap: () => ({ message: "Language must be either English (en) or French (fr)" }),
  }),
});

export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;
export type UpdateAdminLanguage = z.infer<typeof updateAdminLanguageSchema>;

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
  fullName: z.string()
    .min(2, "Full name must be at least 2 characters")
    .refine(name => {
      // Split the full name by spaces and check if each part contains only allowed characters
      const nameParts = name.trim().split(/\s+/);
      return nameParts.every(part => /^[a-zA-ZÀ-ÖØ-öø-ÿ.\-']+$/.test(part));
    }, {
      message: "Names should contain only letters and basic characters"
    }),
  yearOfBirth: z.number()
    .min(1900, "Year of birth must be after 1900")
    .max(new Date().getFullYear(), "Year of birth cannot be in the future"),
  sex: z.enum(["Masculin", "Feminin"], {
    errorMap: () => ({ message: "Please select either Masculin or Feminin" }),
  }),
  municipality: z.string().min(1, "Municipality selection is required"),
  email: z.string()
    .email("Invalid email format")
    .refine(email => email === null || email === "" || /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email), {
      message: "Please enter a valid email address with proper format (e.g., name@example.com)"
    })
    .optional()
    .nullable(),
  phoneNumber: z.string()
    .min(7, "Phone number must be at least 7 characters")
    .refine(
      phone => {
        // Remove all non-digit characters for validation
        const digits = phone.replace(/\D/g, '');
        // Phone should have exactly 10 digits
        return digits.length === 10;
      },
      {
        message: "Phone number must be exactly 10 digits"
      }
    ),
});

export type UpdateVisitor = z.infer<typeof updateVisitorSchema>;

// Settings schema for application configuration
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  appName: varchar("app_name", { length: 255 }).default("Visitor Management System").notNull(),
  // Add separate header and footer app names
  headerAppName: varchar("header_app_name", { length: 255 }),
  footerAppName: varchar("footer_app_name", { length: 255 }),
  logoUrl: text("logo_url"),
  countryCode: varchar("country_code", { length: 10 }).default("243").notNull(),
  adminTheme: varchar("admin_theme", { length: 10 }).default("light").notNull(),
  visitorTheme: varchar("visitor_theme", { length: 10 }).default("light").notNull(),
  // Add default language for frontend visitor view
  defaultLanguage: varchar("default_language", { length: 10 }).default("en").notNull(),
  // Keep legacy theme field for backward compatibility
  theme: varchar("theme", { length: 10 }).default("light").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSettingsSchema = createInsertSchema(settings).pick({
  appName: true,
  headerAppName: true,
  footerAppName: true,
  logoUrl: true,
  countryCode: true,
  adminTheme: true,
  visitorTheme: true,
  defaultLanguage: true,
  theme: true, // Include the legacy theme field as well
});

export const updateSettingsSchema = z.object({
  appName: z.string().min(1, "Application name must not be empty"),
  headerAppName: z.string().optional(),
  footerAppName: z.string().optional(),
  logoUrl: z.string().nullable().optional(),
  countryCode: z.string().min(1, "Country code must not be empty").max(5, "Country code should be up to 5 digits"),
  adminTheme: z.enum(["light", "dark", "twilight", "system"], {
    errorMap: () => ({ message: "Theme must be light, dark, twilight, or system" }),
  }),
  visitorTheme: z.enum(["light", "dark", "twilight", "system"], {
    errorMap: () => ({ message: "Theme must be light, dark, twilight, or system" }),
  }),
  defaultLanguage: z.enum(["en", "fr"], {
    errorMap: () => ({ message: "Language must be either English (en) or French (fr)" }),
  }),
  // Keep theme field for backward compatibility
  theme: z.enum(["light", "dark", "twilight", "system"], {
    errorMap: () => ({ message: "Theme must be light, dark, twilight, or system" }),
  }).optional(),
});

export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type UpdateSettings = z.infer<typeof updateSettingsSchema>;

// System logs for important operations
export const systemLogs = pgTable("system_logs", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  details: text("details").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  userId: integer("user_id"),
  affectedRecords: integer("affected_records"),
});

export const insertSystemLogSchema = createInsertSchema(systemLogs).pick({
  action: true,
  details: true,
  userId: true,
  affectedRecords: true,
});

export type SystemLog = typeof systemLogs.$inferSelect;
export type InsertSystemLog = z.infer<typeof insertSystemLogSchema>;

// Visitor Reports schema
export const visitorReports = pgTable("visitor_reports", {
  id: serial("id").primaryKey(),
  visitorId: integer("visitor_id").notNull().references(() => visitors.id),
  adminId: integer("admin_id").notNull().references(() => admins.id),
  reportType: varchar("report_type", { length: 50 }).notNull(),
  description: text("description").notNull(),
  severityLevel: varchar("severity_level", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).default("Open").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolutionDate: timestamp("resolution_date"),
  resolutionNotes: text("resolution_notes"),
});

// Relations for visitor reports
export const visitorReportsRelations = relations(visitorReports, ({ one }) => ({
  visitor: one(visitors, {
    fields: [visitorReports.visitorId],
    references: [visitors.id],
  }),
  admin: one(admins, {
    fields: [visitorReports.adminId],
    references: [admins.id],
  }),
}));

// Update visitor relations to include reports
export const visitorsRelationsWithReports = relations(visitors, ({ many }) => ({
  visits: many(visits),
  reports: many(visitorReports),
}));

// Create schemas for visitor reports
export const insertVisitorReportSchema = createInsertSchema(visitorReports).pick({
  visitorId: true,
  adminId: true,
  reportType: true,
  description: true,
  severityLevel: true,
});

export const updateVisitorReportSchema = z.object({
  id: z.number(),
  status: z.enum(["Open", "Under Review", "Resolved"]),
  resolutionNotes: z.string().optional(),
  resolutionDate: z.date().optional(),
});

export type VisitorReport = typeof visitorReports.$inferSelect;
export type InsertVisitorReport = z.infer<typeof insertVisitorReportSchema>;
export type UpdateVisitorReport = z.infer<typeof updateVisitorReportSchema>;
