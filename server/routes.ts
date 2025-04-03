import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { visitorFormSchema, updateVisitSchema, updateVisitorVerificationSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

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

  // Visitor check-in endpoint
  app.post("/api/visitors/check-in", async (req, res) => {
    try {
      // Validate the form data
      const formData = visitorFormSchema.parse(req.body);
      
      // First, check if visitor exists by email (if provided)
      let visitor;
      if (formData.email) {
        visitor = await storage.getVisitorByEmail(formData.email);
      }
      
      // If visitor doesn't exist, create a new one
      if (!visitor) {
        visitor = await storage.createVisitor({
          fullName: formData.fullName,
          yearOfBirth: formData.yearOfBirth,
          email: formData.email || null,
          phoneNumber: formData.phoneNumber,
        });
      }
      
      // Create a new visit record
      const visit = await storage.createVisit({
        visitorId: visitor.id,
      });
      
      res.status(201).json({ visitor, visit });
    } catch (error) {
      return handleZodError(error, res);
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

  // Get visitor stats for dashboard
  app.get("/api/admin/stats", ensureAuthenticated, async (req, res) => {
    try {
      const activeVisits = await storage.getActiveVisits();
      const visitHistory = await storage.getVisitHistory();
      
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
      
      const stats = {
        totalVisitorsToday: todayVisits.length,
        currentlyCheckedIn: activeVisits.length,
        averageVisitDuration: avgDurationMinutes,
      };
      
      res.status(200).json(stats);
    } catch (error) {
      console.error("Get stats error:", error);
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

  const httpServer = createServer(app);

  return httpServer;
}
