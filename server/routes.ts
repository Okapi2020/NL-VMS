import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { 
  visitorFormSchema, 
  updateVisitSchema, 
  updateVisitorVerificationSchema,
  updateVisitorSchema,
  type Visitor
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

  // Visitor check-in endpoint
  app.post("/api/visitors/check-in", async (req, res) => {
    try {
      // Validate the form data
      const formData = visitorFormSchema.parse(req.body);
      
      // First, check if visitor exists by email or phone number
      let visitor: Visitor | undefined;
      
      if (formData.email) {
        visitor = await storage.getVisitorByEmail(formData.email);
      }
      
      // If not found by email, try to find by phone number
      if (!visitor && formData.phoneNumber) {
        visitor = await storage.getVisitorByPhoneNumber(formData.phoneNumber);
      }
      
      // If visitor doesn't exist, create a new one
      if (!visitor) {
        visitor = await storage.createVisitor({
          fullName: formData.fullName,
          yearOfBirth: formData.yearOfBirth,
          email: formData.email || null,
          phoneNumber: formData.phoneNumber,
        });
        
        if (!visitor) {
          return res.status(500).json({ message: "Failed to create visitor record" });
        }
      } else {
        // If visitor exists but some details have changed, update their record
        // Only update if there are actual changes
        const needsUpdate = (
          visitor.fullName !== formData.fullName ||
          visitor.yearOfBirth !== formData.yearOfBirth ||
          (formData.email && visitor.email !== formData.email) ||
          visitor.phoneNumber !== formData.phoneNumber
        );
        
        if (needsUpdate) {
          const updatedVisitor = await storage.updateVisitor({
            id: visitor.id,
            fullName: formData.fullName,
            yearOfBirth: formData.yearOfBirth,
            email: formData.email || visitor.email,
            phoneNumber: formData.phoneNumber
          });
          
          if (!updatedVisitor) {
            return res.status(500).json({ message: "Failed to update visitor record" });
          }
          
          visitor = updatedVisitor;
        }
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
