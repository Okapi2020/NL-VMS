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

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "visitor-management-system-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: process.env.NODE_ENV === "production",
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
  app.post("/api/admin/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post("/api/admin/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/admin/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}
