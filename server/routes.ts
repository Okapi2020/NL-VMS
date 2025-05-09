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
  updateVisitPartnerSchema,
  insertWebhookSchema,
  updateWebhookSchema,
  type Visitor,
  type Visit,
  type UpdateAdminLanguage,
  type UpdateVisitPartner,
  type InsertWebhook,
  type UpdateWebhook
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { seedDatabase } from "./seed";
import { WebSocketServer, WebSocket } from 'ws';

// Middleware for API key authentication
const validateApiKey = async (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];
  
  try {
    // Get settings from database
    const settings = await storage.getSettings();
    
    if (!settings) {
      console.error("Settings not found when validating API key");
      return res.status(500).json({ error: 'Server error: Cannot validate API key' });
    }
    
    // Check if API is enabled
    if (!settings.apiEnabled) {
      return res.status(403).json({ error: 'Forbidden: API access is disabled' });
    }
    
    // Validate the API key
    if (apiKey === settings.apiKey) {
      next();
    } else {
      // In development mode, also accept a default key for testing
      const isDevelopment = process.env.NODE_ENV !== 'production';
      const devApiKey = process.env.EXTERNAL_API_KEY || 'vms-dev-api-key-2025';
      
      if (isDevelopment && apiKey === devApiKey) {
        next();
      } else {
        return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
      }
    }
  } catch (error) {
    console.error("Error validating API key:", error);
    return res.status(500).json({ error: 'Server error: Cannot validate API key' });
  }
};

// Middleware to ensure user is authenticated
const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  // In development mode, auto-authenticate
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  if (isDevelopment) {
    console.log("Development mode: Bypassing authentication check in middleware");
    // Auto-set a mock admin user on the request in development
    if (!req.user) {
      req.user = {
        id: 1,
        username: 'admin',
        password: '[PROTECTED]',
        preferredLanguage: 'fr'
      };
      // This helps emulate the behavior of req.isAuthenticated()
      if (!req.isAuthenticated) {
        req.isAuthenticated = () => true;
      }
    }
    return next();
  }
  
  // Standard authentication check for production
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

// Helper function to dispatch webhooks for visitor events
const dispatchWebhooks = async (event: string, data: any, visitor?: Visitor) => {
  try {
    // Check if webhooks are enabled in settings
    const settings = await storage.getSettings();
    if (!settings?.webhooksEnabled) {
      console.log(`Webhooks disabled in settings. Skipping dispatch for event: ${event}`);
      return;
    }
    
    // Get all active webhooks that are listening for this event
    const webhooks = await storage.getWebhooks();
    const relevantWebhooks = webhooks.filter(webhook => 
      webhook.active && 
      webhook.events && 
      (webhook.events.includes(event) || webhook.events.includes('all'))
    );
    
    if (relevantWebhooks.length === 0) {
      console.log(`No webhooks configured for event: ${event}`);
      return;
    }
    
    console.log(`Dispatching webhook event ${event} to ${relevantWebhooks.length} endpoints`);
    
    // Prepare data for webhook
    const payload = {
      event,
      timestamp: new Date().toISOString(),
      data,
      visitor: visitor ? {
        id: visitor.id,
        fullName: visitor.fullName,
        email: visitor.email,
        phoneNumber: visitor.phoneNumber,
        verified: visitor.verified,
        visitCount: visitor.visitCount,
        isOnsite: visitor.isOnsite
      } : undefined
    };
    
    // Send the webhook requests in parallel
    const webhookPromises = relevantWebhooks.map(async webhook => {
      try {
        // Add HMAC signature if a secret key is provided
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        
        if (webhook.secretKey) {
          const crypto = require('crypto');
          const hmac = crypto.createHmac('sha256', webhook.secretKey);
          hmac.update(JSON.stringify(payload));
          const signature = hmac.digest('hex');
          headers['X-VMS-Signature'] = signature;
        }
        
        headers['X-VMS-Event'] = event;
        
        // Send the webhook
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });
        
        const success = response.ok;
        console.log(`Webhook ${webhook.id} to ${webhook.url} ${success ? 'succeeded' : 'failed'} with status ${response.status}`);
        
        // Record the outcome
        await storage.recordWebhookCall(webhook.id, success);
        
        return { webhookId: webhook.id, success, statusCode: response.status };
      } catch (error) {
        console.error(`Error dispatching webhook ${webhook.id} to ${webhook.url}:`, error);
        await storage.recordWebhookCall(webhook.id, false);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { webhookId: webhook.id, success: false, error: errorMessage };
      }
    });
    
    const results = await Promise.all(webhookPromises);
    console.log(`Webhook dispatch complete for event ${event}:`, results);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error in webhook dispatch for event ${event}:`, errorMessage);
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server first (to be used by WebSocket server)
  const httpServer = createServer(app);
  
  // Set up WebSocket server for real-time notifications FIRST
  // This ensures the broadcastCheckIn function is available before routes are registered
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    // Set ping interval to 30 seconds to keep connections alive
    clientTracking: true
  });
  
  // Track connected clients
  const clients = new Set<WebSocket>();
  
  // Connection check interval (ping-pong to keep connections alive)
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    });
  }, 30000); // Send ping every 30 seconds
  
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    clients.add(ws);
    
    // Send initial connection confirmation
    ws.send(JSON.stringify({ 
      type: 'connection', 
      message: 'Connected to visitor management system notifications' 
    }));
    
    // Set up ping handler
    ws.on('pong', () => {
      // Connection is alive, can track last activity time here if needed
    });
    
    // Handle client disconnect
    ws.on('close', (code, reason) => {
      console.log(`WebSocket client disconnected: Code ${code}${reason ? ', Reason: ' + reason : ''}`);
      clients.delete(ws);
    });
    
    // Handle client messages
    ws.on('message', (message) => {
      console.log('Received message from client:', message.toString());
      
      // Echo back heartbeat message to confirm connection is alive
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'heartbeat') {
          ws.send(JSON.stringify({ type: 'heartbeat_ack', timestamp: new Date().toISOString() }));
        }
      } catch (e) {
        // Non-JSON message, ignore it
      }
    });
    
    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });
  
  // Define global WebSocket notification functions BEFORE route setup
  global.broadcastCheckIn = (visitor: Visitor, purpose?: string) => {
    console.log('Broadcasting check-in notification for visitor:', visitor.fullName);
    console.log('Number of connected WebSocket clients:', clients.size);
    
    let sentCount = 0;
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        const message = JSON.stringify({
          type: 'check-in',
          visitor: {
            id: visitor.id,
            fullName: visitor.fullName,
            phoneNumber: visitor.phoneNumber,
            verified: visitor.verified
          },
          purpose: purpose || 'Not specified',
          timestamp: new Date().toISOString()
        });
        
        client.send(message);
        sentCount++;
        console.log('Sent notification to client');
      }
    });
    
    console.log(`Successfully sent check-in notification to ${sentCount} clients`);
    
    // If no clients, log a warning
    if (sentCount === 0) {
      console.warn('No active WebSocket clients to receive the notification!');
    }
  };
  
  // Define global partner update notification function
  global.broadcastPartnerUpdate = (
    action: 'linked' | 'unlinked',
    visitId: number,
    partnerId: number | null,
    visitors: { visitor: Visitor, visit: Visit }[]
  ) => {
    // Find the visitors involved
    const mainVisitorData = visitors.find(v => v.visit.id === visitId);
    const partnerVisitorData = partnerId ? visitors.find(v => v.visit.id === partnerId) : null;
    
    if (!mainVisitorData) return; // Guard clause if no visitor found
    
    console.log(`Broadcasting partner ${action} notification for visitor:`, mainVisitorData.visitor.fullName);
    console.log('Number of connected WebSocket clients:', clients.size);
    
    let sentCount = 0;
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        const message = JSON.stringify({
          type: 'partner-update',
          action,
          visitor: {
            id: mainVisitorData.visitor.id,
            fullName: mainVisitorData.visitor.fullName,
            badgeId: mainVisitorData.visitor.id,
          },
          partner: partnerVisitorData ? {
            id: partnerVisitorData.visitor.id,
            fullName: partnerVisitorData.visitor.fullName,
            badgeId: partnerVisitorData.visitor.id,
          } : null,
          timestamp: new Date().toISOString()
        });
        
        client.send(message);
        sentCount++;
        console.log('Sent partner notification to client');
      }
    });
    
    console.log(`Successfully sent partner ${action} notification to ${sentCount} clients`);
    
    // If no clients, log a warning
    if (sentCount === 0) {
      console.warn('No active WebSocket clients to receive the partner notification!');
    }
  };
  
  // Now set up authentication
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
  
  // Regenerate API key endpoint
  app.post("/api/settings/regenerate-api-key", ensureAuthenticated, async (req, res) => {
    try {
      // Generate a new random API key
      const generateApiKey = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const prefix = 'vms-';
        let key = prefix;
        
        // Generate a random string of 32 characters
        for (let i = 0; i < 32; i++) {
          key += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return key;
      };
      
      // Get current settings
      const settings = await storage.getSettings();
      
      if (!settings) {
        return res.status(404).json({ message: "Settings not found" });
      }
      
      // Generate new API key
      const newApiKey = generateApiKey();
      
      // Update settings with new API key
      const updatedSettings = await storage.updateSettings({
        ...settings,
        apiKey: newApiKey
      });
      
      if (!updatedSettings) {
        return res.status(500).json({ message: "Failed to update API key" });
      }
      
      // Log the action
      await storage.createSystemLog({
        action: "API_KEY_REGENERATED",
        details: "API key has been regenerated",
        userId: req.user?.id || null
      });
      
      // Return the new API key
      res.status(200).json({ 
        apiKey: newApiKey,
        message: "API key regenerated successfully" 
      });
    } catch (error) {
      console.error("Error regenerating API key:", error);
      res.status(500).json({ message: "Failed to regenerate API key" });
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
        defaultLanguage: req.body.defaultLanguage,
        apiEnabled: req.body.apiEnabled,
        hasApiKey: !!req.body.apiKey
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
        defaultLanguage: req.body.defaultLanguage || "en", // Default language to English if not provided
        // API settings
        apiKey: req.body.apiKey,
        apiEnabled: req.body.apiEnabled !== undefined ? req.body.apiEnabled : false
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

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok", environment: process.env.NODE_ENV || "development" });
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
        visitor = await storage.createVisitor({
          fullName: formData.fullName,
          yearOfBirth: formData.yearOfBirth,
          sex: formData.sex,
          email: formData.email || null,
          phoneNumber: formData.phoneNumber,
          municipality: formData.municipality,
        });
        
        if (!visitor) {
          return res.status(500).json({ message: "Failed to create visitor record" });
        }
      } else {
        // Flag that this is a returning visitor
        isReturningVisitor = true;
        
        // Check if visitor already has an active visit
        const existingActiveVisit = await storage.getVisitorWithActiveVisit(visitor.id);
        if (existingActiveVisit) {
          return res.status(409).json({ 
            message: "You are already checked in", 
            alreadyCheckedIn: true,
            visit: existingActiveVisit.visit,
            visitor: existingActiveVisit.visitor
          });
        }
        
        // Increment visit count for returning visitors
        visitor = await storage.incrementVisitCount(visitor.id) || visitor;
        
        // Log the returning visitor for admin awareness
        await storage.createSystemLog({
          action: "RETURNING_VISITOR",
          details: `Returning visitor "${visitor.fullName}" (ID: ${visitor.id}) checked in. Visit count: ${visitor.visitCount}.`,
          userId: null // No admin involved, this is visitor self-check-in
        });
      }
      
      // Create a new visit record
      const visit = await storage.createVisit({
        visitorId: visitor.id,
        purpose: formData.purpose || null,
      });
      
      // Mark visitor as on-site
      const updatedVisitor = await storage.updateVisitor(visitor.id, { 
        isOnsite: true,
        lastVisitId: visit.id 
      }) || visitor;
      
      // Broadcast the check-in notification via WebSocket
      if (global.broadcastCheckIn) {
        global.broadcastCheckIn(updatedVisitor, formData.purpose || undefined);
      }
      
      // Send webhook notification for check-in event
      dispatchWebhooks('visitor.checkin', {
        visitId: visit.id,
        checkInTime: visit.checkInTime,
        purpose: formData.purpose || 'Not specified',
        visitType: isReturningVisitor ? 'Returning visitor' : 'New visitor',
        visitCount: updatedVisitor.visitCount
      }, updatedVisitor);
      
      res.status(201).json({ 
        visitor: updatedVisitor, 
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
      let visitor = await storage.getVisitor(visitorId);
      
      if (!visitor) {
        console.error('Visitor not found for ID:', visitorId);
        return res.status(404).json({ message: "Visitor not found" });
      }
      
      console.log('Found visitor:', visitor.id, visitor.fullName);
      
      // Check if visitor already has an active visit
      const existingActiveVisit = await storage.getVisitorWithActiveVisit(visitorId);
      if (existingActiveVisit) {
        console.log('Visitor already has an active visit:', existingActiveVisit.visit.id);
        return res.status(409).json({ 
          message: "You are already checked in", 
          alreadyCheckedIn: true,
          visit: existingActiveVisit.visit,
          visitor: existingActiveVisit.visitor 
        });
      }
      
      // Increment visit count for returning visitor
      const incrementedVisitor = await storage.incrementVisitCount(visitor.id);
      if (incrementedVisitor) {
        visitor = incrementedVisitor;
      }
      
      // Log the returning visitor for admin awareness
      await storage.createSystemLog({
        action: "RETURNING_VISITOR_DIRECT",
        details: `Returning visitor "${visitor.fullName}" (ID: ${visitor.id}) directly checked in. Visit count: ${visitor.visitCount}.`,
        userId: null // No admin involved, this is visitor self-check-in
      });
      
      // Create visit with no purpose (as we decided to remove this field)
      const visit = await storage.createVisit({
        visitorId: visitor.id,
        purpose: null, // No purpose needed for returning visitors with direct check-in
      });
      
      // Mark visitor as on-site
      const updatedVisitor = await storage.updateVisitor(visitor.id, { 
        isOnsite: true,
        lastVisitId: visit.id 
      }) || visitor;
      
      // Broadcast the check-in notification via WebSocket
      if (global.broadcastCheckIn && updatedVisitor) {
        global.broadcastCheckIn(updatedVisitor);
      }
      
      // Send webhook notification for check-in event
      if (updatedVisitor) {
        dispatchWebhooks('visitor.checkin', {
          visitId: visit.id,
          checkInTime: visit.checkInTime,
          purpose: 'Returning visitor - direct check-in',
          visitType: 'Returning visitor',
          visitCount: updatedVisitor.visitCount
        }, updatedVisitor);
      }
      
      res.status(201).json({
        visitor: updatedVisitor,
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
      
      if (updatedVisit) {
        // Get visitor data for the webhook
        const visitor = await storage.getVisitor(visit.visitorId);
        
        if (visitor) {
          // Mark visitor as no longer on-site
          const updatedVisitor = await storage.updateVisitor(visitor.id, { 
            isOnsite: false 
          }) || visitor;
          
          // Send webhook notification for check-out event
          dispatchWebhooks('visitor.checkout', {
            visitId: updatedVisit.id,
            checkInTime: updatedVisit.checkInTime,
            checkOutTime: updatedVisit.checkOutTime,
            duration: updatedVisit.checkOutTime 
              ? Math.floor((updatedVisit.checkOutTime.getTime() - updatedVisit.checkInTime.getTime()) / 1000 / 60) 
              : 0, // Duration in minutes
            purpose: updatedVisit.purpose || 'Not specified'
          }, updatedVisitor);
        }
      }
      
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
      console.log(`Fetching visit history with limit: ${limit}`);
      
      const visitHistoryWithVisitors = await storage.getVisitHistoryWithVisitors(limit);
      
      // Apply additional validation to ensure the data is in the expected format
      if (!Array.isArray(visitHistoryWithVisitors)) {
        throw new Error("Invalid visit history data format");
      }
      
      // Log the total count of visits
      console.log(`Retrieved ${visitHistoryWithVisitors.length} visit history records`);
      
      res.status(200).json(visitHistoryWithVisitors);
    } catch (error) {
      console.error("Get visit history error:", error);
      res.status(500).json({ 
        message: "An error occurred while loading the visit history. Please refresh the page and try again.",
        error: error instanceof Error ? error.message : "Unknown error"
      });
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
      
      // First, get the original visit to check if it has a partner
      const originalVisit = await storage.getVisit(visitData.id);
      if (!originalVisit) {
        return res.status(404).json({ message: "Visit not found" });
      }
      
      // Update the primary visit
      const updatedVisit = await storage.updateVisit(visitData);
      
      if (!updatedVisit) {
        return res.status(404).json({ message: "Visit not found" });
      }
      
      // Get visitor data for the webhook
      const visitor = await storage.getVisitor(originalVisit.visitorId);
      
      if (visitor) {
        // Mark visitor as no longer on-site
        const updatedVisitor = await storage.updateVisitor(visitor.id, { isOnsite: false }) || visitor;
        
        // Send webhook notification for admin check-out event
        dispatchWebhooks('visitor.checkout', {
          visitId: updatedVisit.id,
          checkInTime: updatedVisit.checkInTime,
          checkOutTime: updatedVisit.checkOutTime,
          duration: updatedVisit.checkOutTime 
            ? Math.floor((updatedVisit.checkOutTime.getTime() - updatedVisit.checkInTime.getTime()) / 1000 / 60) 
            : 0, // Duration in minutes
          purpose: updatedVisit.purpose || 'Not specified',
          checkoutBy: 'admin'
        }, updatedVisitor);
      }
      
      // If the visit has a partner, also check out the partner visit
      if (originalVisit.partnerId) {
        // Get partner visit to confirm it exists and is still active
        const partnerVisit = await storage.getVisit(originalVisit.partnerId);
        
        if (partnerVisit && partnerVisit.active) {
          // Check out the partner visit with the same checkout time
          const partnerVisitData = updateVisitSchema.parse({
            id: originalVisit.partnerId,
            checkOutTime: visitData.checkOutTime,
            active: false,
          });
          
          await storage.updateVisit(partnerVisitData);
          
          // Create system log for the synchronized checkout
          const adminId = req.user?.id;
          await storage.createSystemLog({
            action: "PARTNER_SYNCHRONIZED_CHECKOUT",
            details: `Partner visit ID ${originalVisit.partnerId} was automatically checked out with visit ID ${visitData.id}`,
            userId: adminId,
            affectedRecords: 2,
          });
          
          console.log(`Partner synchronized checkout: Visit #${visitData.id} and partner #${originalVisit.partnerId}`);
        }
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
      
      // Extract visitor ID and create update data object
      const { id, ...updateData } = visitorData;
      
      // Clean up email field (convert empty strings to null)
      if (updateData.email === "") {
        updateData.email = null;
      }
      
      // Update visitor
      const updatedVisitor = await storage.updateVisitor(id, updateData);
      
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
  
  // Get all registered visitors (not deleted)
  app.get("/api/admin/all-visitors", ensureAuthenticated, async (req, res) => {
    try {
      const allVisitors = await storage.getAllVisitors();
      // Filter out deleted visitors
      const registeredVisitors = allVisitors.filter(visitor => visitor.deleted !== true);
      
      // For each visitor, get their total visit count and most recent visit
      const visitorsWithDetails = await Promise.all(
        registeredVisitors.map(async (visitor) => {
          // Get all visits for this visitor
          const visitorVisits = await storage.getVisitsByVisitorId(visitor.id);
          
          // Get the most recent visit date
          const lastVisit = visitorVisits.length > 0 
            ? visitorVisits.sort((a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime())[0]
            : null;
          
          return {
            visitor,
            visitCount: visitorVisits.length,
            lastVisit: lastVisit ? {
              checkInTime: lastVisit.checkInTime,
              checkOutTime: lastVisit.checkOutTime
            } : null
          };
        })
      );
      
      res.status(200).json(visitorsWithDetails);
    } catch (error) {
      console.error("Error fetching registered visitors:", error);
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
  
  // Visitor report endpoints
  
  // Create a new visitor report
  app.post("/api/admin/visitor-reports", ensureAuthenticated, async (req, res) => {
    try {
      const adminId = req.user?.id; // Get the current admin's ID
      
      // Validate the report data
      if (!req.body.visitorId || !req.body.reportType || !req.body.description || !req.body.severityLevel) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Create the report
      const report = await storage.createVisitorReport({
        visitorId: req.body.visitorId,
        adminId: adminId || 0, // Fallback to 0 if adminId is undefined
        reportType: req.body.reportType,
        description: req.body.description,
        severityLevel: req.body.severityLevel,
      });
      
      // Add a system log entry
      await storage.createSystemLog({
        action: "VISITOR_REPORT_CREATED",
        details: `Admin created a ${req.body.severityLevel} severity report for visitor ID ${req.body.visitorId}`,
        userId: adminId,
        affectedRecords: 1,
      });
      
      res.status(201).json(report);
    } catch (error) {
      console.error("Error creating visitor report:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all reports
  app.get("/api/admin/visitor-reports", ensureAuthenticated, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const reports = await storage.getVisitorReports(limit);
      res.status(200).json(reports);
    } catch (error) {
      console.error("Error getting visitor reports:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get a specific report
  app.get("/api/admin/visitor-reports/:id", ensureAuthenticated, async (req, res) => {
    try {
      const reportId = parseInt(req.params.id);
      if (isNaN(reportId)) {
        return res.status(400).json({ message: "Invalid report ID" });
      }
      
      const report = await storage.getVisitorReport(reportId);
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }
      
      res.status(200).json(report);
    } catch (error) {
      console.error("Error getting visitor report:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all non-deleted visitors (for reports and dropdowns)
  app.get("/api/admin/visitors", ensureAuthenticated, async (req, res) => {
    try {
      const visitors = await storage.getAllVisitors();
      res.status(200).json(visitors);
    } catch (error) {
      console.error("Error getting all visitors:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update a specific visitor
  app.patch("/api/admin/visitors/:id", ensureAuthenticated, async (req, res) => {
    try {
      const visitorId = parseInt(req.params.id);
      if (isNaN(visitorId)) {
        return res.status(400).json({ message: "Invalid visitor ID" });
      }
      
      // Validate update data
      const updateData = req.body;
      
      // Clean up email field (convert empty strings to null)
      if (updateData.email === "") {
        updateData.email = null;
      }
      
      // Get the visitor and update
      const updatedVisitor = await storage.updateVisitor(visitorId, updateData);
      if (!updatedVisitor) {
        return res.status(404).json({ message: "Visitor not found" });
      }
      
      res.status(200).json(updatedVisitor);
    } catch (error) {
      console.error("Error updating visitor:", error);
      res.status(500).json({ message: "Failed to update visitor" });
    }
  });

  // Get all reports for a specific visitor
  app.get("/api/admin/visitors/:id/reports", ensureAuthenticated, async (req, res) => {
    try {
      const visitorId = parseInt(req.params.id);
      if (isNaN(visitorId)) {
        return res.status(400).json({ message: "Invalid visitor ID" });
      }
      
      const reports = await storage.getVisitorReportsByVisitor(visitorId);
      res.status(200).json(reports);
    } catch (error) {
      console.error("Error getting visitor reports:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update a report's status/notes
  app.patch("/api/admin/visitor-reports/:id", ensureAuthenticated, async (req, res) => {
    try {
      const reportId = parseInt(req.params.id);
      if (isNaN(reportId)) {
        return res.status(400).json({ message: "Invalid report ID" });
      }
      
      // Validate update data
      if (!req.body.status) {
        return res.status(400).json({ message: "Status is required" });
      }
      
      // Ensure the report exists
      const existingReport = await storage.getVisitorReport(reportId);
      if (!existingReport) {
        return res.status(404).json({ message: "Report not found" });
      }
      
      // Update the report
      const updatedReport = await storage.updateVisitorReport({
        id: reportId,
        status: req.body.status,
        resolutionNotes: req.body.resolutionNotes,
        resolutionDate: req.body.resolutionDate ? new Date(req.body.resolutionDate) : undefined
      });
      
      // Log the update
      await storage.createSystemLog({
        action: "VISITOR_REPORT_UPDATED",
        details: `Admin updated report #${reportId} status to ${req.body.status}`,
        userId: req.user?.id,
        affectedRecords: 1,
      });
      
      res.status(200).json(updatedReport);
    } catch (error) {
      console.error("Error updating visitor report:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Partner Tracking Feature - Set/update visit partner
  app.post("/api/admin/visits/partner", ensureAuthenticated, async (req, res) => {
    try {


// Export full database
app.get("/api/admin/export-database", ensureAuthenticated, async (req, res) => {
  try {
    // Get all data
    const visitorData = await storage.getAllVisitors();
    const visitHistory = await storage.getVisitHistory(5000);
    const activeVisits = await storage.getActiveVisits();
    const systemLogs = await storage.getSystemLogs(5000);
    const settings = await storage.getSettings();
    
    // Compile full database export
    const databaseExport = {
      visitors: visitorData,
      visits: [...visitHistory, ...activeVisits],
      systemLogs: systemLogs,
      settings: settings,
      exportDate: new Date().toISOString(),
      version: "1.0"
    };

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=database-export-${new Date().toISOString().split('T')[0]}.json`);
    
    res.status(200).json(databaseExport);
  } catch (error) {
    console.error("Database export error:", error);
    res.status(500).json({ message: "Failed to export database" });
  }
});

      const partnerData = updateVisitPartnerSchema.parse(req.body);
      
      // Check if the visit exists
      const visit = await storage.getVisit(partnerData.visitId);
      if (!visit) {
        return res.status(404).json({ message: "Visit not found" });
      }
      
      // If partnerId is provided, check if the partner visit exists
      if (partnerData.partnerId !== null) {
        const partnerVisit = await storage.getVisit(partnerData.partnerId);
        if (!partnerVisit) {
          return res.status(404).json({ message: "Partner visit not found" });
        }
        
        // Check if both visits are active
        if (!visit.active || !partnerVisit.active) {
          return res.status(400).json({ message: "Cannot partner with inactive visits. Both visits must be active." });
        }
        
        // Don't allow a visit to be partnered with itself
        if (visit.id === partnerVisit.id) {
          return res.status(400).json({ message: "Cannot set a visit as its own partner" });
        }
      }
      
      // Update the partner relationship
      const success = await storage.updateVisitPartner(partnerData);
      
      if (!success) {
        return res.status(500).json({ message: "Failed to update visit partner" });
      }
      
      // Create system log
      const adminId = req.user?.id;
      await storage.createSystemLog({
        action: partnerData.partnerId ? "VISIT_PARTNER_ADDED" : "VISIT_PARTNER_REMOVED",
        details: partnerData.partnerId ? 
          `Visit ID ${partnerData.visitId} partnered with Visit ID ${partnerData.partnerId}` :
          `Partner removed from Visit ID ${partnerData.visitId}`,
        userId: adminId,
        affectedRecords: partnerData.partnerId ? 2 : 1, // Both visits are affected when adding a partner
      });
      
      // Return success response
      res.status(200).json({ 
        success: true, 
        message: partnerData.partnerId ? "Partner assigned successfully" : "Partner removed successfully" 
      });
    } catch (error) {
      return handleZodError(error, res);
    }
  });
  
  // Partner Tracking Feature - Set visit partner (frontend API endpoint)
  app.post("/api/admin/set-visit-partner", ensureAuthenticated, async (req, res) => {
    try {
      const partnerData = updateVisitPartnerSchema.parse(req.body);
      
      // Check if the visit exists
      const visit = await storage.getVisit(partnerData.visitId);
      if (!visit) {
        return res.status(404).json({ message: "Visit not found" });
      }
      
      // Check if the partner visit exists
      if (partnerData.partnerId !== null) {
        const partnerVisit = await storage.getVisit(partnerData.partnerId);
        if (!partnerVisit) {
          return res.status(404).json({ message: "Partner visit not found" });
        }
      }
      
      // Check if both visits are active (only if we have a partnerId)
      if (partnerData.partnerId !== null) {
        const partnerVisit = await storage.getVisit(partnerData.partnerId);
        if (!partnerVisit) {
          return res.status(404).json({ message: "Partner visit not found" });
        }
        
        if (!visit.active || !partnerVisit.active) {
          return res.status(400).json({ message: "Cannot partner with inactive visits. Both visits must be active." });
        }
        
        // Don't allow a visit to be partnered with itself
        if (visit.id === partnerVisit.id) {
          return res.status(400).json({ message: "Cannot set a visit as its own partner" });
        }
      }
      
      try {
        // Update the partner relationship
        const success = await storage.updateVisitPartner(partnerData);
        
        if (!success) {
          return res.status(500).json({ message: "Failed to update visit partner" });
        }
        
        // Create system log
        const adminId = req.user?.id;
        await storage.createSystemLog({
          action: partnerData.partnerId ? "VISIT_PARTNER_ADDED" : "VISIT_PARTNER_REMOVED",
          details: partnerData.partnerId 
            ? `Visit ID ${partnerData.visitId} partnered with Visit ID ${partnerData.partnerId}`
            : `Partner association removed for Visit ID ${partnerData.visitId}`,
          userId: adminId,
          affectedRecords: 2, // Both visits are affected when adding/removing a partner
        });
      } catch (error) {
        console.error("Error in set-visit-partner route:", error);
        return res.status(500).json({ 
          message: "Failed to update visit partner", 
          error: error instanceof Error ? error.message : String(error)
        });
      }
      
      // Send real-time notification for partner update
      if (global.broadcastPartnerUpdate && partnerData.partnerId !== null) {
        // Get the current active visits with visitors for notification data
        const activeVisits = await storage.getActiveVisitsWithVisitors();
        global.broadcastPartnerUpdate('linked', partnerData.visitId, partnerData.partnerId, activeVisits);
      }
      
      // Return success response
      res.status(200).json({ 
        success: true, 
        message: "Partner assigned successfully" 
      });
    } catch (error) {
      return handleZodError(error, res);
    }
  });
  
  // Partner Tracking Feature - Remove visit partner (frontend API endpoint)
  app.post("/api/admin/remove-visit-partner", ensureAuthenticated, async (req, res) => {
    try {
      const partnerData = updateVisitPartnerSchema.parse({
        visitId: req.body.visitId,
        partnerId: null
      });
      
      // Check if the visit exists
      const visit = await storage.getVisit(partnerData.visitId);
      if (!visit) {
        return res.status(404).json({ message: "Visit not found" });
      }
      
      // Update the partner relationship (remove partner)
      const success = await storage.updateVisitPartner(partnerData);
      
      if (!success) {
        return res.status(500).json({ message: "Failed to remove visit partner" });
      }
      
      // Create system log
      const adminId = req.user?.id;
      await storage.createSystemLog({
        action: "VISIT_PARTNER_REMOVED",
        details: `Partner removed from Visit ID ${partnerData.visitId}`,
        userId: adminId,
        affectedRecords: 1
      });
      
      // Send real-time notification for partner removal
      if (global.broadcastPartnerUpdate) {
        // Get the current active visits with visitors for notification data
        const activeVisits = await storage.getActiveVisitsWithVisitors();
        global.broadcastPartnerUpdate('unlinked', partnerData.visitId, null, activeVisits);
      }
      
      // Return success response
      res.status(200).json({ 
        success: true, 
        message: "Partner removed successfully" 
      });
    } catch (error) {
      return handleZodError(error, res);
    }
  });
  
  // Partner Tracking Feature - Get visit partner details
  app.get("/api/admin/visits/:id/partner", ensureAuthenticated, async (req, res) => {
    try {
      const visitId = parseInt(req.params.id);
      if (isNaN(visitId)) {
        return res.status(400).json({ message: "Invalid visit ID" });
      }
      
      // Check if the visit exists
      const visit = await storage.getVisit(visitId);
      if (!visit) {
        return res.status(404).json({ message: "Visit not found" });
      }
      
      // Get partner details if available
      const partnerDetails = await storage.getVisitPartner(visitId);
      
      if (!partnerDetails) {
        return res.status(404).json({ message: "No partner found for this visit" });
      }
      
      res.status(200).json(partnerDetails);
    } catch (error) {
      console.error("Error fetching visit partner:", error);
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
      // Find the most recent reset marker if any
      const resetMarker = visitHistory.find(visit => visit.purpose === "__DURATION_RESET_MARKER__");
      const resetTime = resetMarker ? new Date(resetMarker.checkInTime) : null;
      
      let totalDuration = 0;
      let visitsWithDuration = 0;
      
      visitHistory.forEach(visit => {
        if (visit.checkOutTime && visit.purpose !== "__DURATION_RESET_MARKER__") {
          // Only include visits after the reset marker if one exists
          if (!resetTime || new Date(visit.checkInTime) > resetTime) {
            const duration = new Date(visit.checkOutTime).getTime() - new Date(visit.checkInTime).getTime();
            totalDuration += duration;
            visitsWithDuration++;
          }
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
      
      // Filter out deleted visitors for a more accurate count
      const activeVisitors = allVisitors.filter(visitor => !visitor.deleted);
      
      const returningVisitorsPercentage = activeVisitors.length > 0 
        ? Math.round((returningVisitors / activeVisitors.length) * 100) 
        : 0;
      
      const stats = {
        totalVisitorsToday: todayVisits.length,
        currentlyCheckedIn: activeVisits.length,
        averageVisitDuration: avgDurationMinutes,
        uniqueVisitorsToday,
        percentChangeFromAvg: percentChange,
        totalRegisteredVisitors: activeVisitors.length, // Only count non-deleted visitors
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
  
  // Reset average visit duration counter
  app.post("/api/admin/reset-avg-duration", ensureAuthenticated, async (req, res) => {
    try {
      const success = await storage.resetAverageVisitDuration();
      
      if (success) {
        // Create system log for the reset
        const adminId = req.user?.id;
        await storage.createSystemLog({
          action: "STATISTICS_RESET",
          details: "Average visit duration counter was reset",
          userId: adminId,
          affectedRecords: 1,
        });
        
        // Return success response
        res.status(200).json({ 
          success: true, 
          message: "Average visit duration reset successfully" 
        });
      } else {
        res.status(500).json({ message: "Failed to reset average visit duration" });
      }
    } catch (error) {
      console.error("Reset average visit duration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
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
      
      if (!phoneNumber) {
        return res.status(400).json({ message: "Phone number is required" });
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
      
      // Check if visitor already has an active visit
      const activeVisitData = await storage.getVisitorWithActiveVisit(visitor.id);
      
      // Create a system log entry for this lookup
      await storage.createSystemLog({
        action: "RETURNING_VISITOR_LOOKUP",
        details: `Returning visitor "${visitor.fullName}" (ID: ${visitor.id}) looked up via phone number.${activeVisitData ? " Visitor already has an active visit." : ""}`,
        userId: null
      });
      
      // Return visitor information along with active visit status
      res.status(200).json({ 
        found: true,
        visitor,
        hasActiveVisit: !!activeVisitData,
        activeVisit: activeVisitData ? {
          visitor: activeVisitData.visitor,
          visit: activeVisitData.visit
        } : null
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

  // ==========================================================================
  // EXTERNAL API ENDPOINTS FOR INTEGRATION WITH OTHER APPLICATIONS (E.G. LARAVEL)
  // ==========================================================================
  
  // Get only visitors who are currently onsite
  app.get("/api/external/visitors/onsite", async (req, res, next) => {
    try {
      await validateApiKey(req, res, next);
    } catch (error) {
      return; // Error response already sent by middleware
    }
  }, async (req, res) => {
    try {
      console.log("External API: Request for onsite visitors received");
      
      // Parse query parameters for filtering and pagination
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 100;
      const sortBy = req.query.sortBy as string || 'id';
      const sortOrder = req.query.sortOrder as string || 'asc';
      
      // Get visitors with is_onsite flag set to true
      const onsiteVisitors = await storage.getOnsiteVisitors({
        page,
        limit,
        sortBy,
        sortOrder
      });
      
      // Get total count of onsite visitors for pagination
      const totalCount = await storage.getOnsiteVisitorCount();
      
      return res.json({
        data: onsiteVisitors,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      });
    } catch (error) {
      console.error("External API error - getOnsiteVisitors:", error);
      return res.status(500).json({ error: "Failed to fetch onsite visitors" });
    }
  });
  
  // Get all visitors with pagination and filtering options
  app.get("/api/external/visitors", async (req, res, next) => {
    try {
      await validateApiKey(req, res, next);
    } catch (error) {
      return; // Error response already sent by middleware
    }
  }, async (req, res) => {
    try {
      console.log("External API: Request for all visitors received");
      
      // Parse query parameters for filtering and pagination
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 100;
      const name = req.query.name as string;
      const verified = req.query.verified === 'true';
      const sortBy = req.query.sortBy as string || 'id';
      const sortOrder = req.query.sortOrder as string || 'asc';
      const modifiedSince = req.query.modifiedSince ? new Date(req.query.modifiedSince as string) : undefined;
      const searchPartial = req.query.searchPartial === 'true';
      
      // Check settings to see if partial search is enabled
      const settings = await storage.getSettings();
      const enablePartialSearch = settings?.enablePartialSearch || false;
      
      // Get all visitors with possible filters
      const visitors = await storage.getAllVisitorsWithFilters({
        page,
        limit,
        name,
        verified: req.query.verified !== undefined ? verified : undefined,
        sortBy,
        sortOrder,
        modifiedSince,
        searchPartial: searchPartial && enablePartialSearch,
      });
      
      // Get total count for pagination
      const totalCount = await storage.getVisitorCount({
        name,
        verified: req.query.verified !== undefined ? verified : undefined,
      });
      
      return res.json({
        data: visitors,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      });
    } catch (error) {
      console.error("External API error - getAllVisitors:", error);
      return res.status(500).json({ error: "Failed to fetch visitors" });
    }
  });
  
  // Get a specific visitor by ID
  app.get("/api/external/visitors/:id", async (req, res, next) => {
    try {
      await validateApiKey(req, res, next);
    } catch (error) {
      return; // Error response already sent by middleware
    }
  }, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid visitor ID" });
      }
      
      const visitor = await storage.getVisitorById(id);
      
      if (!visitor) {
        return res.status(404).json({ error: "Visitor not found" });
      }
      
      return res.json(visitor);
    } catch (error) {
      console.error(`External API error - getVisitor(${req.params.id}):`, error);
      return res.status(500).json({ error: "Failed to fetch visitor" });
    }
  });
  
  // Get all visits with pagination and filtering options
  app.get("/api/external/visits", async (req, res, next) => {
    try {
      await validateApiKey(req, res, next);
    } catch (error) {
      return; // Error response already sent by middleware
    }
  }, async (req, res) => {
    try {
      console.log("External API: Request for all visits received");
      
      // Parse query parameters for filtering and pagination
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 100;
      const status = req.query.status as string; // 'active', 'completed'
      const dateFrom = req.query.dateFrom as string;
      const dateTo = req.query.dateTo as string;
      const visitorId = req.query.visitorId ? parseInt(req.query.visitorId as string) : undefined;
      
      // Determine if we need active or completed visits
      let visits = [];
      
      if (status === 'active') {
        visits = await storage.getActiveVisits();
      } else if (status === 'completed') {
        visits = await storage.getCompletedVisits({
          page,
          limit,
          dateFrom: dateFrom ? new Date(dateFrom) : undefined,
          dateTo: dateTo ? new Date(dateTo) : undefined,
          visitorId
        });
      } else {
        // Get all visits (both active and completed)
        const activeVisits = await storage.getActiveVisits();
        const completedVisits = await storage.getCompletedVisits({
          page,
          limit: Math.max(0, limit - activeVisits.length),
          dateFrom: dateFrom ? new Date(dateFrom) : undefined,
          dateTo: dateTo ? new Date(dateTo) : undefined,
          visitorId
        });
        
        visits = [...activeVisits, ...completedVisits];
      }
      
      return res.json({
        data: visits,
        pagination: {
          page,
          limit,
          total: visits.length
        }
      });
    } catch (error) {
      console.error("External API error - getAllVisits:", error);
      return res.status(500).json({ error: "Failed to fetch visits" });
    }
  });
  
  // Get visitor statistics and analytics
  app.get("/api/external/statistics", async (req, res, next) => {
    try {
      await validateApiKey(req, res, next);
    } catch (error) {
      return; // Error response already sent by middleware
    }
  }, async (req, res) => {
    try {
      console.log("External API: Request for statistics received");
      
      // Get the time range from query parameters
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : new Date(new Date().setDate(new Date().getDate() - 30)); // Default to last 30 days
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : new Date();
      
      // Get stats from storage
      const stats = await storage.getVisitorStats(dateFrom, dateTo);
      
      // Format the stats in a more consumable way
      const result = {
        periodStart: dateFrom.toISOString(),
        periodEnd: dateTo.toISOString(),
        totalVisits: stats.totalVisits,
        uniqueVisitors: stats.uniqueVisitors,
        averageDuration: stats.averageDuration,
        visitsByDay: stats.visitsByDay,
        visitsByPurpose: stats.visitsByPurpose,
        visitsByMunicipality: stats.visitsByMunicipality,
        visitsByGender: stats.visitsByGender,
        verifiedPercentage: stats.verifiedPercentage
      };
      
      return res.json(result);
    } catch (error) {
      console.error("External API error - getStatistics:", error);
      return res.status(500).json({ error: "Failed to fetch statistics" });
    }
  });
  
  // API endpoint documentation
  app.get("/api/external", async (req, res, next) => {
    try {
      await validateApiKey(req, res, next);
    } catch (error) {
      return; // Error response already sent by middleware
    }
  }, (req, res) => {
    res.json({
      name: "Visitor Management System API",
      version: "1.0",
      description: "API for integrating with the Visitor Management System",
      endpoints: [
        { 
          path: "/api/external/visitors", 
          method: "GET", 
          description: "Get all visitors with pagination and filtering",
          parameters: [
            { name: "page", type: "number", description: "Page number for pagination" },
            { name: "limit", type: "number", description: "Number of records per page" },
            { name: "name", type: "string", description: "Filter by visitor name" },
            { name: "verified", type: "boolean", description: "Filter by verification status" },
            { name: "sortBy", type: "string", description: "Field to sort by" },
            { name: "sortOrder", type: "string", description: "Sort order (asc/desc)" },
            { name: "modifiedSince", type: "date", description: "Filter for visitors modified after this date (ISO format)" },
            { name: "searchPartial", type: "boolean", description: "Enable partial name matching for search (if allowed in settings)" }
          ]
        },
        { 
          path: "/api/external/visitors/onsite", 
          method: "GET", 
          description: "Get only visitors who are currently onsite",
          parameters: [
            { name: "page", type: "number", description: "Page number for pagination" },
            { name: "limit", type: "number", description: "Number of records per page" },
            { name: "sortBy", type: "string", description: "Field to sort by" },
            { name: "sortOrder", type: "string", description: "Sort order (asc/desc)" }
          ]
        },
        { 
          path: "/api/external/visitors/:id", 
          method: "GET", 
          description: "Get a specific visitor by ID",
          parameters: [
            { name: "id", type: "number", description: "Visitor ID" }
          ]
        },
        { 
          path: "/api/external/visits", 
          method: "GET", 
          description: "Get all visits with pagination and filtering",
          parameters: [
            { name: "page", type: "number", description: "Page number for pagination" },
            { name: "limit", type: "number", description: "Number of records per page" },
            { name: "status", type: "string", description: "Filter by status (active/completed)" },
            { name: "dateFrom", type: "date", description: "Filter by start date" },
            { name: "dateTo", type: "date", description: "Filter by end date" },
            { name: "visitorId", type: "number", description: "Filter by visitor ID" }
          ]
        },
        { 
          path: "/api/external/statistics", 
          method: "GET", 
          description: "Get visitor statistics and analytics",
          parameters: [
            { name: "dateFrom", type: "date", description: "Start date for statistics" },
            { name: "dateTo", type: "date", description: "End date for statistics" }
          ]
        }
      ],
      authentication: "API Key required in X-API-Key header"
    });
  });

  // Webhook management routes
  // Get all webhooks
  app.get("/api/admin/webhooks", ensureAuthenticated, async (req, res) => {
    try {
      const webhooks = await storage.getWebhooks();
      res.status(200).json(webhooks);
    } catch (error) {
      console.error("Error fetching webhooks:", error);
      res.status(500).json({ message: "Failed to fetch webhooks" });
    }
  });
  
  // Get a single webhook by ID
  app.get("/api/admin/webhooks/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid webhook ID" });
      }
      
      const webhook = await storage.getWebhook(id);
      if (!webhook) {
        return res.status(404).json({ message: "Webhook not found" });
      }
      
      res.status(200).json(webhook);
    } catch (error) {
      console.error(`Error fetching webhook:`, error);
      res.status(500).json({ message: "Failed to fetch webhook" });
    }
  });
  
  // Create a new webhook
  app.post("/api/admin/webhooks", ensureAuthenticated, async (req, res) => {
    try {
      // Validate the request body against the schema
      const webhookData = insertWebhookSchema.parse(req.body);
      
      // Add admin ID
      const data: InsertWebhook = {
        ...webhookData,
        createdById: req.user?.id || null
      };
      
      // Create the webhook
      const webhook = await storage.createWebhook(data);
      
      // Log the action
      await storage.createSystemLog({
        action: "CREATE_WEBHOOK",
        details: `Created webhook for URL: ${webhook.url}`,
        userId: req.user?.id || null,
        affectedRecords: 1
      });
      
      res.status(201).json(webhook);
    } catch (error) {
      if (error instanceof ZodError) {
        return handleZodError(error, res);
      }
      console.error("Error creating webhook:", error);
      res.status(500).json({ message: "Failed to create webhook" });
    }
  });
  
  // Update a webhook
  app.patch("/api/admin/webhooks/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid webhook ID" });
      }
      
      // Check if webhook exists
      const existingWebhook = await storage.getWebhook(id);
      if (!existingWebhook) {
        return res.status(404).json({ message: "Webhook not found" });
      }
      
      // Validate the request body against the schema
      const updateData = updateWebhookSchema.parse({
        id,
        ...req.body
      });
      
      // Update the webhook
      const updatedWebhook = await storage.updateWebhook(updateData);
      if (!updatedWebhook) {
        return res.status(500).json({ message: "Failed to update webhook" });
      }
      
      // Log the action
      await storage.createSystemLog({
        action: "UPDATE_WEBHOOK",
        details: `Updated webhook ID: ${id}`,
        userId: req.user?.id || null,
        affectedRecords: 1
      });
      
      res.status(200).json(updatedWebhook);
    } catch (error) {
      if (error instanceof ZodError) {
        return handleZodError(error, res);
      }
      console.error(`Error updating webhook:`, error);
      res.status(500).json({ message: "Failed to update webhook" });
    }
  });
  
  // Delete a webhook
  app.delete("/api/admin/webhooks/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid webhook ID" });
      }
      
      // Check if webhook exists
      const existingWebhook = await storage.getWebhook(id);
      if (!existingWebhook) {
        return res.status(404).json({ message: "Webhook not found" });
      }
      
      // Delete the webhook
      const success = await storage.deleteWebhook(id);
      if (!success) {
        return res.status(500).json({ message: "Failed to delete webhook" });
      }
      
      // Log the action
      await storage.createSystemLog({
        action: "DELETE_WEBHOOK",
        details: `Deleted webhook ID: ${id}`,
        userId: req.user?.id || null,
        affectedRecords: 1
      });
      
      res.status(200).json({ message: "Webhook deleted successfully" });
    } catch (error) {
      console.error(`Error deleting webhook:`, error);
      res.status(500).json({ message: "Failed to delete webhook" });
    }
  });
  
  // Toggle webhook active status
  app.post("/api/admin/webhooks/:id/toggle", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid webhook ID" });
      }
      
      // Check if webhook exists
      const existingWebhook = await storage.getWebhook(id);
      if (!existingWebhook) {
        return res.status(404).json({ message: "Webhook not found" });
      }
      
      // Toggle the active status
      const updateData: UpdateWebhook = {
        id,
        url: existingWebhook.url,
        description: existingWebhook.description,
        secretKey: existingWebhook.secretKey,
        events: existingWebhook.events || [],
        active: !existingWebhook.active
      };
      
      // Update the webhook
      const updatedWebhook = await storage.updateWebhook(updateData);
      if (!updatedWebhook) {
        return res.status(500).json({ message: "Failed to toggle webhook status" });
      }
      
      // Log the action
      await storage.createSystemLog({
        action: "TOGGLE_WEBHOOK",
        details: `Changed webhook ID ${id} status to ${updatedWebhook.active ? 'active' : 'inactive'}`,
        userId: req.user?.id || null,
        affectedRecords: 1
      });
      
      res.status(200).json(updatedWebhook);
    } catch (error) {
      console.error(`Error toggling webhook status:`, error);
      res.status(500).json({ message: "Failed to toggle webhook status" });
    }
  });
  
  // Reset webhook failure count
  app.post("/api/admin/webhooks/:id/reset", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid webhook ID" });
      }
      
      // Check if webhook exists
      const existingWebhook = await storage.getWebhook(id);
      if (!existingWebhook) {
        return res.status(404).json({ message: "Webhook not found" });
      }
      
      // Record a successful call to reset the failure count
      await storage.recordWebhookCall(id, true);
      
      // Get the updated webhook
      const updatedWebhook = await storage.getWebhook(id);
      
      // Log the action
      await storage.createSystemLog({
        action: "RESET_WEBHOOK_FAILURES",
        details: `Reset failure count for webhook ID: ${id}`,
        userId: req.user?.id || null,
        affectedRecords: 1
      });
      
      res.status(200).json(updatedWebhook);
    } catch (error) {
      console.error(`Error resetting webhook failure count:`, error);
      res.status(500).json({ message: "Failed to reset webhook failure count" });
    }
  });

  // Add server cleanup on application shutdown
  const cleanup = () => {
    console.log('Closing WebSocket server and connections...');
    
    // Clear the ping interval
    if (pingInterval) {
      clearInterval(pingInterval);
    }
    
    // Close all WebSocket connections gracefully
    wss.clients.forEach((client) => {
      client.terminate();
    });
    
    // Close the WebSocket server
    wss.close(() => {
      console.log('WebSocket server closed.');
    });
  };
  
  // Handle process termination signals
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  
  // Return the existing httpServer that was initialized at the beginning of the function
  return httpServer;
}
