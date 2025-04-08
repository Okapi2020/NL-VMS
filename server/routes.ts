import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { 
  visitorFormSchema, 
  updateVisitSchema, 
  updateVisitorVerificationSchema,
  updateVisitorSchema,
  updateAdminLanguageSchema,
  type Visitor,
  type UpdateAdminLanguage
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { seedDatabase } from "./seed";
import { WebSocketServer, WebSocket } from 'ws';

// Middleware to ensure user is authenticated
const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

// Helper to format ZodErrors
const handleZodError = (error: unknown, res: Response) => {
  if (error instanceof ZodError) {
    const validationError = fromZodError(error);
    return res.status(400).json({ message: validationError.message });
  }
  return res.status(500).json({ message: "Internal Server Error" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);
  
  // Settings endpoints
  app.get("/api/settings", async (req, res) => {
    try {
      let settings = await storage.getSettings();
      
      // If no settings exist, create default ones
      if (!settings) {
        settings = await storage.createDefaultSettings();
      }
      
      res.status(200).json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch application settings" });
    }
  });
  
  app.post("/api/settings", ensureAuthenticated, async (req, res) => {
    try {
      if (!req.body) {
        console.error("Settings update error: Empty request body");
        return res.status(400).json({ message: "Empty request body" });
      }
      
      // Better logging for troubleshooting
      console.log("Settings update request received:", { 
        hasAppName: !!req.body.appName,
        hasHeaderAppName: !!req.body.headerAppName,
        hasFooterAppName: !!req.body.footerAppName,
        logoUrlLength: req.body.logoUrl ? req.body.logoUrl.length : 0,
        countryCode: req.body.countryCode,
        theme: req.body.theme,
        adminTheme: req.body.adminTheme,
        visitorTheme: req.body.visitorTheme,
        defaultLanguage: req.body.defaultLanguage
      });
      
      // Update settings
      const updatedSettings = await storage.updateSettings({
        appName: req.body.appName,
        // Include header and footer app names
        headerAppName: req.body.headerAppName || req.body.appName,
        footerAppName: req.body.footerAppName || req.body.appName,
        logoUrl: req.body.logoUrl,
        countryCode: req.body.countryCode || "243", // Default to 243 if not provided
        theme: req.body.theme || "light", // Default to light if not provided
        adminTheme: req.body.adminTheme || req.body.theme || "light", // Use adminTheme, fallback to theme
        visitorTheme: req.body.visitorTheme || req.body.theme || "light", // Use visitorTheme, fallback to theme
        defaultLanguage: req.body.defaultLanguage || "en" // Default language to English if not provided
      });
      
      if (!updatedSettings) {
        return res.status(500).json({ message: "Failed to update settings" });
      }
      
      console.log("Settings updated successfully");
      res.status(200).json(updatedSettings);
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ 
        message: "Failed to update application settings", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Visitor check-in endpoint
  app.post("/api/visitors/check-in", async (req, res) => {
    try {
      // Validate the form data
      const formData = visitorFormSchema.parse(req.body);
      
      // First, check if visitor exists by phone number
      let visitor: Visitor | undefined;
      
      if (formData.phoneNumber) {
        visitor = await storage.getVisitorByPhoneNumber(formData.phoneNumber);
      }
      
      // Track if this is a returning visitor
      let isReturningVisitor = false;
      
      // If visitor doesn't exist, create a new one
      if (!visitor) {
        // Create a new visitor record
        console.log("Creating new visitor:", formData.fullName, formData.phoneNumber);
        visitor = await storage.createVisitor({
          fullName: formData.fullName,
          yearOfBirth: formData.yearOfBirth,
          sex: formData.sex,
          email: formData.email || null,
          phoneNumber: formData.phoneNumber,
        });
        
        if (!visitor) {
          return res.status(500).json({ message: "Failed to create visitor record" });
        }
      } else {
        // Flag that this is a returning visitor
        isReturningVisitor = true;
        
        // Log the returning visitor for admin awareness
        console.log(`Returning visitor found: "${visitor.fullName}" (ID: ${visitor.id}). NO data update performed.`);
        await storage.createSystemLog({
          action: "RETURNING_VISITOR",
          details: `Returning visitor "${visitor.fullName}" (ID: ${visitor.id}) checked in.`,
          userId: null // No admin involved, this is visitor self-check-in
        });
        
        // IMPORTANT: We DO NOT update the existing visitor's information
        // This is by design - returning visitors should have their information unchanged
        // If information needs to be updated, it should be done by an admin
        // Only create a visit with the existing visitor record
      }
      
      // Create a new visit record
      const visit = await storage.createVisit({
        visitorId: visitor.id,
        purpose: formData.purpose || null,
      });
      
      // Broadcast the check-in notification via WebSocket
      if (global.broadcastCheckIn) {
        global.broadcastCheckIn(visitor, formData.purpose || undefined);
      }
      
      res.status(201).json({ 
        visitor, 
        visit,
        isReturningVisitor 
      });
    } catch (error) {
      return handleZodError(error, res);
    }
  });
  
  // Direct check-in for returning visitors (by ID)
  app.post("/api/visitors/check-in/returning", async (req, res) => {
    try {
      console.log('Direct check-in request received:', req.body);
      const { visitorId } = req.body;
      
      if (!visitorId || typeof visitorId !== 'number') {
        console.error('Invalid visitor ID:', visitorId);
        return res.status(400).json({ message: "Visitor ID is required" });
      }
      
      // Get the visitor
      console.log('Looking up visitor with ID:', visitorId);
      const visitor = await storage.getVisitor(visitorId);
      
      if (!visitor) {
        console.error('Visitor not found for ID:', visitorId);
        return res.status(404).json({ message: "Visitor not found" });
      }
      
      console.log('Found visitor:', visitor.id, visitor.fullName);
      
      // Log the returning visitor for admin awareness
      await storage.createSystemLog({
        action: "RETURNING_VISITOR_DIRECT",
        details: `Returning visitor "${visitor.fullName}" (ID: ${visitor.id}) directly checked in.`,
        userId: null // No admin involved, this is visitor self-check-in
      });
      
      // Create visit with no purpose (as we decided to remove this field)
      const visit = await storage.createVisit({
        visitorId: visitor.id,
        purpose: null, // No purpose needed for returning visitors with direct check-in
      });
      
      // Broadcast the check-in notification via WebSocket
      if (global.broadcastCheckIn) {
        global.broadcastCheckIn(visitor);
      }
      
      res.status(201).json({
        visitor,
        visit,
        isReturningVisitor: true
      });
    } catch (error) {
      console.error("Direct check-in error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Visitor check-out endpoint
  app.post("/api/visitors/check-out", async (req, res) => {
    try {
      const { visitId } = req.body;
      
      if (!visitId || typeof visitId !== 'number') {
        return res.status(400).json({ message: "Visit ID is required" });
      }
      
      const visit = await storage.getVisit(visitId);
      
      if (!visit) {
        return res.status(404).json({ message: "Visit not found" });
      }
      
      if (!visit.active) {
        return res.status(400).json({ message: "Visit is already checked out" });
      }
      
      const updatedVisit = await storage.updateVisit({
        id: visitId,
        checkOutTime: new Date(),
        active: false,
      });
      
      res.status(200).json(updatedVisit);
    } catch (error) {
      console.error("Check-out error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get active visit by visitor ID
  app.get("/api/visitors/:id/active-visit", async (req, res) => {
    try {
      const visitorId = parseInt(req.params.id);
      
      if (isNaN(visitorId)) {
        return res.status(400).json({ message: "Invalid visitor ID" });
      }
      
      const visitorWithVisit = await storage.getVisitorWithActiveVisit(visitorId);
      
      if (!visitorWithVisit) {
        return res.status(404).json({ message: "No active visit found for this visitor" });
      }
      
      res.status(200).json(visitorWithVisit);
    } catch (error) {
      console.error("Get active visit error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Admin endpoints
  
  // Verify a visitor (removed duplicate implementation)
  
  // Get all current (active) visitors with their visit details
  app.get("/api/admin/current-visitors", ensureAuthenticated, async (req, res) => {
    try {
      const activeVisitsWithVisitors = await storage.getActiveVisitsWithVisitors();
      res.status(200).json(activeVisitsWithVisitors);
    } catch (error) {
      console.error("Get current visitors error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get visit history with visitor details
  app.get("/api/admin/visit-history", ensureAuthenticated, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const visitHistoryWithVisitors = await storage.getVisitHistoryWithVisitors(limit);
      res.status(200).json(visitHistoryWithVisitors);
    } catch (error) {
      console.error("Get visit history error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Admin check-out visitor
  app.post("/api/admin/check-out-visitor", ensureAuthenticated, async (req, res) => {
    try {
      const visitData = updateVisitSchema.parse({
        id: req.body.visitId,
        checkOutTime: new Date(),
        active: false,
      });
      
      const updatedVisit = await storage.updateVisit(visitData);
      
      if (!updatedVisit) {
        return res.status(404).json({ message: "Visit not found" });
      }
      
      res.status(200).json(updatedVisit);
    } catch (error) {
      return handleZodError(error, res);
    }
  });
  
  // Admin trigger auto-checkout for all active visitors
  app.post("/api/admin/auto-checkout", ensureAuthenticated, async (req, res) => {
    try {
      // Get admin info from session
      const adminId = req.user?.id;
      
      // Call the manual auto-checkout function
      if (global.manualAutoCheckout) {
        const checkedOutCount = await global.manualAutoCheckout(adminId);
        res.status(200).json({ 
          message: `Successfully checked out ${checkedOutCount} visitors`,
          count: checkedOutCount
        });
      } else {
        res.status(500).json({ 
          message: "Auto-checkout functionality not initialized properly"
        });
      }
    } catch (error) {
      console.error("Manual auto-checkout error:", error);
      res.status(500).json({ 
        message: "Error during auto-checkout process" 
      });
    }
  });
  
  // Admin update visit purpose
  app.post("/api/admin/update-visit-purpose", ensureAuthenticated, async (req, res) => {
    try {
      const { visitId, purpose } = req.body;
      
      if (!visitId || typeof visitId !== 'number') {
        return res.status(400).json({ message: "Valid visit ID is required" });
      }
      
      if (!purpose || typeof purpose !== 'string') {
        return res.status(400).json({ message: "Valid purpose is required" });
      }
      
      const visitData = updateVisitSchema.parse({
        id: visitId,
        purpose: purpose,
      });
      
      const updatedVisit = await storage.updateVisit(visitData);
      
      if (!updatedVisit) {
        return res.status(404).json({ message: "Visit not found" });
      }
      
      res.status(200).json(updatedVisit);
    } catch (error) {
      return handleZodError(error, res);
    }
  });
  
  // Admin update visitor verification status
  app.post("/api/admin/verify-visitor", ensureAuthenticated, async (req, res) => {
    try {
      const verificationData = updateVisitorVerificationSchema.parse({
        id: req.body.visitorId,
        verified: req.body.verified,
      });
      
      const updatedVisitor = await storage.updateVisitorVerification(verificationData);
      
      if (!updatedVisitor) {
        return res.status(404).json({ message: "Visitor not found" });
      }
      
      res.status(200).json(updatedVisitor);
    } catch (error) {
      return handleZodError(error, res);
    }
  });
  
  // Admin update language preference
  app.post("/api/admin/update-language", ensureAuthenticated, async (req, res) => {
    try {
      // Validate request body
      const languageData = updateAdminLanguageSchema.parse({
        id: req.user?.id,
        preferredLanguage: req.body.preferredLanguage,
      });
      
      // Update admin language preference
      const updatedAdmin = await storage.updateAdminLanguage(languageData);
      
      if (!updatedAdmin) {
        return res.status(404).json({ message: "Admin user not found" });
      }
      
      res.status(200).json(updatedAdmin);
    } catch (error) {
      return handleZodError(error, res);
    }
  });
  
  // Admin update visitor information
  app.put("/api/admin/update-visitor", ensureAuthenticated, async (req, res) => {
    try {
      const visitorData = updateVisitorSchema.parse(req.body);
      
      // Check if visitor exists
      const existingVisitor = await storage.getVisitor(visitorData.id);
      if (!existingVisitor) {
        return res.status(404).json({ message: "Visitor not found" });
      }
      
      // Update visitor
      const updatedVisitor = await storage.updateVisitor(visitorData);
      
      if (!updatedVisitor) {
        return res.status(500).json({ message: "Failed to update visitor" });
      }
      
      res.status(200).json(updatedVisitor);
    } catch (error) {
      return handleZodError(error, res);
    }
  });
  
  // Admin soft delete visitor (move to trash)
  app.delete("/api/admin/delete-visitor/:id", ensureAuthenticated, async (req, res) => {
    try {
      const visitorId = parseInt(req.params.id);
      
      if (isNaN(visitorId)) {
        return res.status(400).json({ message: "Invalid visitor ID" });
      }
      
      // Check if visitor exists
      const existingVisitor = await storage.getVisitor(visitorId);
      if (!existingVisitor) {
        return res.status(404).json({ message: "Visitor not found" });
      }
      
      // Soft delete visitor (move to trash)
      const success = await storage.deleteVisitor(visitorId);
      
      if (!success) {
        return res.status(400).json({ 
          message: "Cannot delete visitor. Ensure they have no active visits." 
        });
      }
      
      res.status(200).json({ success: true, message: "Visitor moved to trash" });
    } catch (error) {
      console.error("Delete visitor error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get deleted visitors (trash bin)
  app.get("/api/admin/trash", ensureAuthenticated, async (req, res) => {
    try {
      const deletedVisitors = await storage.getDeletedVisitors();
      res.status(200).json(deletedVisitors);
    } catch (error) {
      console.error("Get trash error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Restore visitor from trash
  app.post("/api/admin/restore-visitor/:id", ensureAuthenticated, async (req, res) => {
    try {
      const visitorId = parseInt(req.params.id);
      
      if (isNaN(visitorId)) {
        return res.status(400).json({ message: "Invalid visitor ID" });
      }
      
      const restoredVisitor = await storage.restoreVisitor(visitorId);
      
      if (!restoredVisitor) {
        return res.status(404).json({ message: "Visitor not found in trash" });
      }
      
      res.status(200).json({ 
        success: true, 
        message: "Visitor restored successfully",
        visitor: restoredVisitor
      });
    } catch (error) {
      console.error("Restore visitor error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Permanently delete a visitor
  app.delete("/api/admin/permanently-delete/:id", ensureAuthenticated, async (req, res) => {
    try {
      const visitorId = parseInt(req.params.id);
      
      if (isNaN(visitorId)) {
        return res.status(400).json({ message: "Invalid visitor ID" });
      }
      
      const success = await storage.permanentlyDeleteVisitor(visitorId);
      
      if (!success) {
        return res.status(500).json({ message: "Failed to permanently delete visitor" });
      }
      
      res.status(200).json({ 
        success: true, 
        message: "Visitor permanently deleted"
      });
    } catch (error) {
      console.error("Permanently delete visitor error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Empty recycle bin
  app.delete("/api/admin/empty-bin", ensureAuthenticated, async (req, res) => {
    try {
      const success = await storage.emptyRecycleBin();
      
      if (!success) {
        return res.status(500).json({ message: "Failed to empty recycle bin" });
      }
      
      res.status(200).json({ 
        success: true, 
        message: "Recycle bin emptied successfully"
      });
    } catch (error) {
      console.error("Empty recycle bin error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get system logs
  app.get("/api/admin/system-logs", ensureAuthenticated, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      
      if (isNaN(limit) || limit <= 0) {
        return res.status(400).json({ message: "Invalid limit parameter" });
      }
      
      const logs = await storage.getSystemLogs(limit);
      res.status(200).json(logs);
    } catch (error) {
      console.error("Get system logs error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get visitor stats for dashboard
  app.get("/api/admin/stats", ensureAuthenticated, async (req, res) => {
    try {
      const activeVisits = await storage.getActiveVisits();
      const visitHistory = await storage.getVisitHistory();
      const allVisitors = await storage.getAllVisitors();
      
      // Get today's visitors
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayVisits = [...activeVisits, ...visitHistory].filter(
        visit => new Date(visit.checkInTime) >= today
      );
      
      // Calculate average visit duration for completed visits
      let totalDuration = 0;
      let visitsWithDuration = 0;
      
      visitHistory.forEach(visit => {
        if (visit.checkOutTime) {
          const duration = new Date(visit.checkOutTime).getTime() - new Date(visit.checkInTime).getTime();
          totalDuration += duration;
          visitsWithDuration++;
        }
      });
      
      const avgDurationMs = visitsWithDuration > 0 ? totalDuration / visitsWithDuration : 0;
      const avgDurationMinutes = Math.round(avgDurationMs / (1000 * 60));
      
      // Get visits from last week for comparison
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      lastWeek.setHours(0, 0, 0, 0);
      
      const lastWeekVisits = [...activeVisits, ...visitHistory].filter(
        visit => new Date(visit.checkInTime) >= lastWeek && new Date(visit.checkInTime) < today
      );

      // Count unique visitors
      const uniqueVisitorIdsToday = Array.from(new Set(todayVisits.map(visit => visit.visitorId)));
      const uniqueVisitorsToday = uniqueVisitorIdsToday.length;
      
      // Peak visit hours calculation
      const hourCounts = Array(24).fill(0);
      visitHistory.forEach(visit => {
        const hour = new Date(visit.checkInTime).getHours();
        hourCounts[hour]++;
      });
      const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
      
      // Calculate percentage change in visitors
      const avgDailyLastWeek = lastWeekVisits.length / 7;
      const percentChange = avgDailyLastWeek > 0 
        ? Math.round((todayVisits.length / avgDailyLastWeek - 1) * 100) 
        : 0;
      
      // Count returning visitors
      const visitorVisitCounts: Record<number, number> = {};
      visitHistory.forEach(visit => {
        if (!visitorVisitCounts[visit.visitorId]) {
          visitorVisitCounts[visit.visitorId] = 0;
        }
        visitorVisitCounts[visit.visitorId]++;
      });
      
      const returningVisitors = Object.values(visitorVisitCounts).filter(count => Number(count) > 1).length;
      const returningVisitorsPercentage = allVisitors.length > 0 
        ? Math.round((returningVisitors / allVisitors.length) * 100) 
        : 0;
      
      const stats = {
        totalVisitorsToday: todayVisits.length,
        currentlyCheckedIn: activeVisits.length,
        averageVisitDuration: avgDurationMinutes,
        uniqueVisitorsToday,
        percentChangeFromAvg: percentChange,
        totalRegisteredVisitors: allVisitors.length,
        returningVisitors,
        returningVisitorsPercentage,
        peakHour,
        totalVisitsAllTime: visitHistory.length + activeVisits.length,
      };
      
      res.status(200).json(stats);
    } catch (error) {
      console.error("Get stats error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Analytics and reporting endpoints
  
  // Advanced analytics endpoints
  app.get("/api/analytics/data", ensureAuthenticated, async (req, res) => {
    try {
      console.log("Analytics request received:", req.query);
      
      // Extract query parameters
      const { fromDate, toDate, interval = 'day' } = req.query;
      
      // Set default date range if none provided (last 30 days)
      const end = toDate ? new Date(toDate as string) : new Date();
      let start;
      
      if (fromDate) {
        start = new Date(fromDate as string);
      } else {
        start = new Date();
        start.setDate(start.getDate() - 30); // Default to last 30 days
      }
      
      // Ensure end date includes the entire day
      end.setHours(23, 59, 59, 999);
      
      // Validate dates
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        console.error("Invalid date format:", { fromDate, toDate, start, end });
        return res.status(400).json({ message: "Invalid date format" });
      }
      
      console.log("Date range for analytics:", { start: start.toISOString(), end: end.toISOString(), interval });
      
      // Fetch all visits 
      const visitHistory = await storage.getVisitHistory(5000); // Increased limit for better analytics
      console.log(`Retrieved ${visitHistory.length} historical visits`);
      
      const activeVisits = await storage.getActiveVisits();
      console.log(`Retrieved ${activeVisits.length} active visits`);
      
      const allVisits = [...visitHistory, ...activeVisits];
      
      // Filter visits in date range
      const visitsInRange = allVisits.filter(visit => {
        const visitDate = new Date(visit.checkInTime);
        return visitDate >= start && visitDate <= end;
      });
      
      console.log(`Found ${visitsInRange.length} visits in the selected date range`);
      
      // Group visits by interval
      interface IntervalData {
        count: number;
        active: number;
        completed: number;
        avgDuration: number;
        totalDuration: number;
        completedVisits: number;
      }
      
      let visitsByInterval: Record<string, IntervalData> = {};
      const hourDistribution = Array(24).fill(0);
      const dayOfWeekDistribution = Array(7).fill(0);
      
      // If we have no visits, return empty data to avoid errors
      if (visitsInRange.length === 0) {
        console.log("No visits found in date range, returning empty dataset");
        return res.status(200).json({
          summary: {
            totalVisits: 0,
            uniqueVisitors: 0,
            completedVisits: 0,
            activeVisits: 0,
            averageVisitDuration: 0
          },
          timeSeries: [],
          byHour: hourDistribution.map((_, hour) => ({
            hour: String(hour).padStart(2, '0'),
            count: 0
          })),
          byDayOfWeek: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => ({
            day,
            count: 0
          }))
        });
      }
      
      visitsInRange.forEach(visit => {
        const visitDate = new Date(visit.checkInTime);
        let intervalKey;
        
        // Group by specified interval
        switch(interval) {
          case 'hour':
            intervalKey = `${visitDate.getFullYear()}-${String(visitDate.getMonth() + 1).padStart(2, '0')}-${String(visitDate.getDate()).padStart(2, '0')} ${String(visitDate.getHours()).padStart(2, '0')}:00`;
            break;
          case 'day':
            intervalKey = `${visitDate.getFullYear()}-${String(visitDate.getMonth() + 1).padStart(2, '0')}-${String(visitDate.getDate()).padStart(2, '0')}`;
            break;
          case 'week':
            // Get the week number
            const firstDayOfYear = new Date(visitDate.getFullYear(), 0, 1);
            const dayOfYear = Math.floor((visitDate.getTime() - firstDayOfYear.getTime()) / (24 * 60 * 60 * 1000));
            const weekNumber = Math.ceil((dayOfYear + firstDayOfYear.getDay() + 1) / 7);
            intervalKey = `${visitDate.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
            break;
          case 'month':
            intervalKey = `${visitDate.getFullYear()}-${String(visitDate.getMonth() + 1).padStart(2, '0')}`;
            break;
          default:
            intervalKey = `${visitDate.getFullYear()}-${String(visitDate.getMonth() + 1).padStart(2, '0')}-${String(visitDate.getDate()).padStart(2, '0')}`;
        }
        
        // Initialize or increment count
        if (!visitsByInterval[intervalKey]) {
          visitsByInterval[intervalKey] = {
            count: 0,
            active: 0,
            completed: 0,
            avgDuration: 0,
            totalDuration: 0,
            completedVisits: 0
          };
        }
        
        visitsByInterval[intervalKey].count++;
        
        if (visit.active) {
          visitsByInterval[intervalKey].active++;
        } else {
          visitsByInterval[intervalKey].completed++;
          
          if (visit.checkOutTime) {
            const duration = new Date(visit.checkOutTime).getTime() - new Date(visit.checkInTime).getTime();
            visitsByInterval[intervalKey].totalDuration += duration;
            visitsByInterval[intervalKey].completedVisits++;
          }
        }
        
        // Update hour distribution
        hourDistribution[visitDate.getHours()]++;
        
        // Update day of week distribution (0 = Sunday, 6 = Saturday)
        dayOfWeekDistribution[visitDate.getDay()]++;
      });
      
      // Calculate average duration for each interval and create a new object for each interval
      const processedIntervals: Record<string, { 
        count: number; 
        active: number; 
        completed: number; 
        avgDuration: number;
      }> = {};
      
      Object.keys(visitsByInterval).forEach(key => {
        const interval = visitsByInterval[key];
        let avgDuration = 0;
        
        if (interval.completedVisits > 0) {
          avgDuration = Math.round(interval.totalDuration / interval.completedVisits / (1000 * 60)); // in minutes
        }
        
        // Create a new object with only the properties we want
        processedIntervals[key] = {
          count: interval.count,
          active: interval.active,
          completed: interval.completed,
          avgDuration: avgDuration
        };
      });
      
      // Prepare the time series data using processed intervals
      const timeSeriesData = Object.entries(processedIntervals).map(([date, data]) => ({
        date,
        ...data
      })).sort((a, b) => a.date.localeCompare(b.date));
      
      console.log(`Generated ${timeSeriesData.length} time series data points`);
      
      // Calculate summary statistics
      const totalVisits = visitsInRange.length;
      const uniqueVisitorIds = Array.from(new Set(visitsInRange.map(v => v.visitorId)));
      const uniqueVisitors = uniqueVisitorIds.length;
      const completedVisits = visitsInRange.filter(v => !v.active).length;
      const activeVisitsCount = visitsInRange.filter(v => v.active).length;
      
      let totalDuration = 0;
      let visitsWithDuration = 0;
      
      visitsInRange.forEach(visit => {
        if (visit.checkOutTime) {
          const duration = new Date(visit.checkOutTime).getTime() - new Date(visit.checkInTime).getTime();
          totalDuration += duration;
          visitsWithDuration++;
        }
      });
      
      const avgDurationMinutes = visitsWithDuration > 0 ? Math.round(totalDuration / visitsWithDuration / (1000 * 60)) : 0;
      
      // Format day of week distribution with labels
      const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayOfWeekData = dayOfWeekDistribution.map((count, index) => ({
        day: dayLabels[index],
        count
      }));
      
      // Format hour distribution
      const hourData = hourDistribution.map((count, hour) => ({
        hour: String(hour).padStart(2, '0'),
        count
      }));
      
      const analytics = {
        summary: {
          totalVisits,
          uniqueVisitors,
          completedVisits,
          activeVisits: activeVisitsCount,
          averageVisitDuration: avgDurationMinutes
        },
        timeSeries: timeSeriesData,
        byHour: hourData,
        byDayOfWeek: dayOfWeekData
      };
      
      console.log("Analytics data prepared successfully");
      res.status(200).json(analytics);
    } catch (error) {
      console.error("Analytics error:", error);
      // Send detailed error information in development
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : "";
      res.status(500).json({ 
        message: "Failed to generate analytics data", 
        error: errorMessage,
        stack: process.env.NODE_ENV === "production" ? undefined : errorStack
      });
    }
  });
  
  // Export visits data for analytics
  app.get("/api/analytics/export", ensureAuthenticated, async (req, res) => {
    try {
      const { fromDate, toDate } = req.query;
      
      // Set default date range if none provided (last 30 days)
      const end = toDate ? new Date(toDate as string) : new Date();
      let start;
      
      if (fromDate) {
        start = new Date(fromDate as string);
      } else {
        start = new Date();
        start.setDate(start.getDate() - 30); // Default to last 30 days
      }
      
      // Ensure end date includes the entire day
      end.setHours(23, 59, 59, 999);
      
      // Validate dates
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }
      
      // Fetch visit history and active visits
      const visitHistory = await storage.getVisitHistory(5000);
      const activeVisits = await storage.getActiveVisits();
      const allVisits = [...visitHistory, ...activeVisits];
      
      // Filter visits in date range
      const visitsInRange = allVisits.filter(visit => {
        const visitDate = new Date(visit.checkInTime);
        return visitDate >= start && visitDate <= end;
      });
      
      // Create a map of visitor ID to visitor data for easier lookup
      const visitorMap = new Map();
      
      // Get unique visitor IDs from the filtered visits
      const visitorIds = Array.from(new Set(visitsInRange.map(v => v.visitorId)));
      
      // Fetch visitor data for each visitor ID
      for (const id of visitorIds) {
        const visitor = await storage.getVisitor(id);
        if (visitor) {
          visitorMap.set(id, visitor);
        }
      }
      
      // Format data for export
      const exportData = visitsInRange.map(visit => {
        const visitor = visitorMap.get(visit.visitorId);
        const checkInTime = new Date(visit.checkInTime).toISOString();
        const checkOutTime = visit.checkOutTime ? new Date(visit.checkOutTime).toISOString() : '';
        
        let visitDuration = '';
        if (visit.checkOutTime) {
          const durationMs = new Date(visit.checkOutTime).getTime() - new Date(visit.checkInTime).getTime();
          const durationMinutes = Math.round(durationMs / (1000 * 60));
          visitDuration = durationMinutes.toString();
        }
        
        return {
          VisitorName: visitor ? visitor.fullName : 'Unknown',
          Email: visitor ? visitor.email || '' : '',
          Phone: visitor ? visitor.phoneNumber || '' : '',
          YearOfBirth: visitor ? visitor.yearOfBirth : 0,
          CheckInTime: checkInTime,
          CheckOutTime: checkOutTime,
          VisitStatus: visit.active ? 'Active' : 'Completed',
          VisitDuration: visitDuration
        };
      });
      
      res.status(200).json(exportData);
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Export visits data
  app.get("/api/admin/export", ensureAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate, format = 'json' } = req.query;
      
      // Default to last 30 days if no dates provided
      const end = endDate ? new Date(endDate as string) : new Date();
      end.setHours(23, 59, 59, 999);
      
      const start = startDate ? new Date(startDate as string) : new Date();
      if (!startDate) {
        start.setDate(start.getDate() - 30); // Default to last 30 days
        start.setHours(0, 0, 0, 0);
      }
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }
      
      // Get visit history with visitors
      const visitHistoryWithVisitors = await storage.getVisitHistoryWithVisitors(1000);
      const activeVisitsWithVisitors = await storage.getActiveVisitsWithVisitors();
      
      // Combined and filter by date range
      const allVisits = [...visitHistoryWithVisitors, ...activeVisitsWithVisitors].filter(({ visit }) => {
        const visitDate = new Date(visit.checkInTime);
        return visitDate >= start && visitDate <= end;
      });
      
      // Format data for export
      const formattedData = allVisits.map(({ visit, visitor }) => ({
        VisitorName: visitor.fullName,
        Email: visitor.email || "",
        Phone: visitor.phoneNumber,
        YearOfBirth: visitor.yearOfBirth,
        CheckInTime: new Date(visit.checkInTime).toISOString(),
        CheckOutTime: visit.checkOutTime ? new Date(visit.checkOutTime).toISOString() : "",
        VisitStatus: visit.active ? "Active" : "Completed",
        VisitDuration: visit.checkOutTime 
          ? Math.round((new Date(visit.checkOutTime).getTime() - new Date(visit.checkInTime).getTime()) / (1000 * 60))
          : ""
      }));
      
      // Send response based on requested format
      if (format === 'csv') {
        // For a real CSV export, we would generate a CSV file here
        // For now, we'll just send the JSON data
        res.status(200).json(formattedData);
      } else {
        res.status(200).json(formattedData);
      }
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // NL Time Controller integration endpoints
  
  // Get all visitors (for NL Time Controller integration)
  app.get("/api/integration/visitors", async (req, res) => {
    try {
      const visitors = await storage.getAllVisitors();
      res.status(200).json(visitors);
    } catch (error) {
      console.error("Get all visitors error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get visitor details by ID (for NL Time Controller integration)
  app.get("/api/integration/visitors/:id", async (req, res) => {
    try {
      const visitorId = parseInt(req.params.id);
      
      if (isNaN(visitorId)) {
        return res.status(400).json({ message: "Invalid visitor ID" });
      }
      
      const visitor = await storage.getVisitor(visitorId);
      
      if (!visitor) {
        return res.status(404).json({ message: "Visitor not found" });
      }
      
      res.status(200).json(visitor);
    } catch (error) {
      console.error("Get visitor by ID error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Lookup a returning visitor by phone number and year of birth
  app.post("/api/visitors/lookup", async (req, res) => {
    try {
      const { phoneNumber, yearOfBirth } = req.body;
      
      // Debug phone number format
      console.log(`Received phone lookup request with phoneNumber: "${phoneNumber}" (length: ${phoneNumber?.length})`);
      
      if (!phoneNumber) {
        return res.status(400).json({ message: "Phone number is required" });
      }
      
      // Validate phone number format (DRC format: 0XXXXXXXXX)
      const normalizedPhone = phoneNumber.replace(/\D/g, '');
      if (normalizedPhone.length !== 10 || !normalizedPhone.startsWith('0')) {
        return res.status(400).json({ 
          found: false,
          message: "Phone number must be 10 digits starting with 0" 
        });
      }
      
      // Look up visitor by phone number
      const visitor = await storage.getVisitorByPhoneNumber(phoneNumber);
      
      if (!visitor) {
        return res.status(404).json({ 
          found: false,
          message: "No visitor found with this phone number" 
        });
      }
      
      // If year of birth was provided, verify it matches
      if (yearOfBirth && visitor.yearOfBirth !== yearOfBirth) {
        return res.status(400).json({ 
          found: false,
          message: "Year of birth does not match our records" 
        });
      }
      
      // Create a system log entry for this lookup
      await storage.createSystemLog({
        action: "RETURNING_VISITOR_LOOKUP",
        details: `Returning visitor "${visitor.fullName}" (ID: ${visitor.id}) looked up via phone number.`,
        userId: null
      });
      
      // Return visitor information
      res.status(200).json({ 
        found: true,
        visitor
      });
    } catch (error) {
      console.error("Visitor lookup error:", error);
      res.status(500).json({ 
        found: false,
        message: "An error occurred during visitor lookup" 
      });
    }
  });
  
  // Get recent visits by visitor ID
  app.get("/api/integration/visitors/:id/visits", async (req, res) => {
    try {
      const visitorId = parseInt(req.params.id);
      
      if (isNaN(visitorId)) {
        return res.status(400).json({ message: "Invalid visitor ID" });
      }
      
      // This would be a custom query to get visits by visitor ID
      // For this example, we'll just return an empty array
      res.status(200).json([]);
    } catch (error) {
      console.error("Get visits by visitor ID error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Seed the database (development only)
  app.get("/api/seed", async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ message: "Seed operation not allowed in production" });
    }
    
    try {
      const count = req.query.count ? parseInt(req.query.count as string) : 50;
      await seedDatabase(count);
      res.status(200).json({ message: `Database seeded with ${count} visitors` });
    } catch (error) {
      console.error("Seed error:", error);
      res.status(500).json({ message: "Error seeding database" });
    }
  });
  
  // We'll import the seed from the migration script instead
  
  // Test endpoint for triggering auto-checkout (for development/testing only)
  app.post("/api/test/auto-checkout", async (req, res) => {
    try {
      if (global.manualAutoCheckout) {
        const checkedOutCount = await global.manualAutoCheckout();
        res.status(200).json({ 
          message: `Test auto-checkout completed. ${checkedOutCount} visitors were checked out.`,
          count: checkedOutCount
        });
      } else {
        res.status(500).json({ message: "Auto-checkout functionality not initialized" });
      }
    } catch (error) {
      console.error("Test auto-checkout error:", error);
      res.status(500).json({ message: "Error during auto-checkout process" });
    }
  });
  
  // Test endpoint to get active visits (for development/testing only)
  app.get("/api/test/active-visits", async (req, res) => {
    try {
      const activeVisits = await storage.getActiveVisits();
      res.status(200).json({ 
        activeVisits,
        count: activeVisits.length
      });
    } catch (error) {
      console.error("Test get active visits error:", error);
      res.status(500).json({ message: "Error retrieving active visits" });
    }
  });
  
  // Test endpoint to get recent visit history (for development/testing only)
  app.get("/api/test/visit-history", async (req, res) => {
    try {
      // Get the 20 most recent visits
      const visitHistory = await storage.getVisitHistory(20);
      res.status(200).json({ 
        visitHistory,
        count: visitHistory.length
      });
    } catch (error) {
      console.error("Test get visit history error:", error);
      res.status(500).json({ message: "Error retrieving visit history" });
    }
  });

  const httpServer = createServer(app);
  
  // Set up WebSocket server for real-time notifications
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Track connected clients
  const clients = new Set<WebSocket>();
  
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    clients.add(ws);
    
    // Send initial connection confirmation
    ws.send(JSON.stringify({ 
      type: 'connection', 
      message: 'Connected to visitor management system notifications' 
    }));
    
    // Handle client disconnect
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      clients.delete(ws);
    });
    
    // Handle client messages
    ws.on('message', (message) => {
      console.log('Received message from client:', message.toString());
    });
  });
  
  // Add a function to the global scope to broadcast check-in notifications
  // This will be called from the visitor check-in endpoint
  global.broadcastCheckIn = (visitor: Visitor, purpose?: string) => {
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'check-in',
          visitor: {
            id: visitor.id,
            fullName: visitor.fullName,
            phoneNumber: visitor.phoneNumber,
            verified: visitor.verified
          },
          purpose: purpose || 'Not specified',
          timestamp: new Date().toISOString()
        }));
      }
    });
  };

  return httpServer;
}
