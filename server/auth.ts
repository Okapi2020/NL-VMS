import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { Admin } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends Admin {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  if (!process.env.SESSION_SECRET) {
    console.warn("No SESSION_SECRET in environment, using a default one");
  }

  const isDevelopment = process.env.NODE_ENV !== 'production';
  console.log(`Current environment: ${isDevelopment ? 'development' : 'production'}`);
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "visitor-management-system-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    name: 'vmsid', // Custom cookie name instead of the default 'connect.sid'
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: isDevelopment ? false : true, // Only use secure cookies in production
      httpOnly: true,
      sameSite: isDevelopment ? 'lax' : 'strict', // More permissive in development
      path: '/',
      domain: undefined // Let the browser set this automatically
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const admin = await storage.getAdminByUsername(username);
        if (!admin || !(await comparePasswords(password, admin.password))) {
          return done(null, false);
        } else {
          return done(null, admin);
        }
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((admin, done) => done(null, admin.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const admin = await storage.getAdmin(id);
      done(null, admin);
    } catch (err) {
      done(err);
    }
  });

  // Create a default admin if none exists
  (async () => {
    try {
      const existingAdmin = await storage.getAdminByUsername("admin");
      if (!existingAdmin) {
        await storage.createAdmin({
          username: "admin",
          password: await hashPassword("admin123"),
        });
        console.log("Default admin created: admin/admin123");
      }
    } catch (error) {
      console.error("Error creating default admin:", error);
    }
  })();

  // Authentication routes
  app.post("/api/admin/login", (req, res, next) => {
    console.log("Login attempt for username:", req.body.username);
    
    passport.authenticate("local", (err: any, user: Express.User | false, info: any) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }
      
      if (!user) {
        console.log("Authentication failed:", info);
        return res.status(401).json({ message: "Authentication failed" });
      }
      
      req.login(user, (err) => {
        if (err) {
          console.error("Session save error:", err);
          return next(err);
        }
        
        // Skip session regeneration in development to help with login issues
        console.log("Login successful for:", user.username);
        console.log("Session ID:", req.sessionID);
        console.log("Session data:", req.session);
        
        // Add session cookie debugging
        const cookieHeader = res.getHeader('Set-Cookie');
        console.log("Setting cookies:", cookieHeader);
        
        return res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/admin/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/admin/user", async (req, res) => {
    console.log("GET /api/admin/user - isAuthenticated:", req.isAuthenticated());
    console.log("Session ID:", req.sessionID);
    
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    if (req.isAuthenticated()) {
      console.log("Authenticated user:", req.user);
      return res.json(req.user);
    } else if (isDevelopment) {
      // In development mode, automatically provide the admin user without authentication
      try {
        const adminUser = await storage.getAdminByUsername("admin");
        if (adminUser) {
          console.log("Development mode: Auto-authenticating as admin");
          return res.json(adminUser);
        }
      } catch (error) {
        console.error("Error auto-authenticating in development:", error);
      }
      return res.sendStatus(401);
    } else {
      console.log("User not authenticated");
      return res.sendStatus(401);
    }
  });
}
