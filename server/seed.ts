import { db } from "./db";
import { visitors, visits } from "@shared/schema";
import { storage } from "./storage";
import * as crypto from "crypto";
import { eq } from "drizzle-orm";

// Sample data generation functions
function getRandomFullName(): string {
  const firstNames = [
    "John", "Jane", "Michael", "Emily", "David", "Sarah", "James", "Emma", 
    "Robert", "Olivia", "William", "Ava", "Richard", "Sophia", "Thomas", "Isabella",
    "Daniel", "Mia", "Matthew", "Charlotte", "Joseph", "Amelia", "Christopher", "Harper",
    "Andrew", "Ella", "Anthony", "Lily", "Mark", "Madison", "Paul", "Grace",
    "Steven", "Chloe", "Kevin", "Zoey", "Brian", "Natalie", "George", "Hannah",
    "Edward", "Layla", "Jason", "Scarlett", "Kenneth", "Addison", "Timothy", "Victoria"
  ];
  
  const lastNames = [
    "Smith", "Johnson", "Williams", "Jones", "Brown", "Davis", "Miller", "Wilson",
    "Moore", "Taylor", "Anderson", "Thomas", "Jackson", "White", "Harris", "Martin",
    "Thompson", "Garcia", "Martinez", "Robinson", "Clark", "Rodriguez", "Lewis", "Lee",
    "Walker", "Hall", "Allen", "Young", "Hernandez", "King", "Wright", "Lopez",
    "Hill", "Scott", "Green", "Adams", "Baker", "Gonzalez", "Nelson", "Carter",
    "Mitchell", "Perez", "Roberts", "Turner", "Phillips", "Campbell", "Parker", "Evans"
  ];
  
  return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
}

function getRandomYearOfBirth(): number {
  // Generate random year between 1950 and 2005
  return Math.floor(Math.random() * (2005 - 1950 + 1)) + 1950;
}

function getRandomEmail(fullName: string): string {
  const domains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "example.com", "company.com"];
  const nameParts = fullName.toLowerCase().replace(/[^a-z ]/g, '').split(' ');
  const domain = domains[Math.floor(Math.random() * domains.length)];
  
  // 20% chance of having no email
  if (Math.random() < 0.2) {
    return "";
  }
  
  // Different email formats
  const emailFormats = [
    `${nameParts[0]}.${nameParts[1]}@${domain}`,
    `${nameParts[0]}${nameParts[1]}@${domain}`,
    `${nameParts[0]}.${nameParts[1]}${Math.floor(Math.random() * 100)}@${domain}`,
    `${nameParts[0][0]}${nameParts[1]}@${domain}`,
    `${nameParts[0]}${nameParts[1][0]}@${domain}`
  ];
  
  return emailFormats[Math.floor(Math.random() * emailFormats.length)];
}

function getRandomPhoneNumber(): string {
  // Generate random phone number formats
  const formats = [
    // (123) 456-7890
    `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
    // 123-456-7890
    `${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
    // +12 34 567 890
    `+${Math.floor(Math.random() * 90) + 10} ${Math.floor(Math.random() * 90) + 10} ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 900) + 100}`
  ];
  
  return formats[Math.floor(Math.random() * formats.length)];
}

function getRandomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function getRandomCheckOutTime(checkInTime: Date): Date | null {
  // 70% chance of having a checkout time
  if (Math.random() < 0.7) {
    // Random duration between 5 minutes and 8 hours
    const durationMs = (Math.random() * (8 * 60 - 5) + 5) * 60 * 1000;
    return new Date(new Date(checkInTime).getTime() + durationMs);
  }
  return null;
}

async function createVisitorWithVisits(index: number, totalVisitors: number): Promise<void> {
  try {
    const fullName = getRandomFullName();
    const yearOfBirth = getRandomYearOfBirth();
    const email = getRandomEmail(fullName);
    const phoneNumber = getRandomPhoneNumber();
    const verified = Math.random() > 0.3; // 70% chance of being verified
    
    // Create visitor
    const visitor = await storage.createVisitor({
      fullName,
      yearOfBirth,
      email: email || null,
      phoneNumber
    });
    
    // Update verification status if needed
    if (verified) {
      await storage.updateVisitorVerification({
        id: visitor.id,
        verified: true
      });
    }
    
    // Create between 1-5 visits for each visitor
    const numVisits = Math.floor(Math.random() * 5) + 1;
    
    // Start date range: between 3 months ago and now
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);
    
    for (let i = 0; i < numVisits; i++) {
      const checkInTime = getRandomDate(startDate, new Date());
      const checkOutTime = getRandomCheckOutTime(checkInTime);
      const active = checkOutTime === null;
      
      // Don't create too many active visits (limit to ~10% of total visits)
      if (active && Math.random() > 0.1) {
        continue;
      }
      
      await storage.createVisit({
        visitorId: visitor.id
      });
      
      // If this visit should be completed, update it
      if (!active && checkOutTime) {
        // Get all visits for this visitor
        const visitorVisits = await db
          .select()
          .from(visits)
          .where(eq(visits.visitorId, visitor.id));
        
        // Find the latest visit manually
        let latestVisit = null;
        for (const visit of visitorVisits) {
          if (!latestVisit || visit.id > latestVisit.id) {
            latestVisit = visit;
          }
        }
        
        if (latestVisit) {
          await db.update(visits)
            .set({
              checkOutTime,
              active: false
            })
            .where(eq(visits.id, latestVisit.id));
        }
      }
    }
    
    // Progress logging
    if (index % 5 === 0 || index === totalVisitors - 1) {
      console.log(`Created ${index + 1} of ${totalVisitors} visitors`);
    }
  } catch (error) {
    console.error("Error creating visitor:", error);
  }
}

export async function seedDatabase(numVisitors: number = 50): Promise<void> {
  console.log(`Starting database seeding with ${numVisitors} visitors...`);
  
  try {
    // Check if we already have visitors
    const existingVisitors = await db.select().from(visitors);
    
    if (existingVisitors.length > 0) {
      console.log(`Database already has ${existingVisitors.length} visitors. Skipping seed.`);
      return;
    }
    
    // Create admin if it doesn't exist
    try {
      const admin = await storage.getAdminByUsername("admin");
      if (!admin) {
        // Hash password using the simple method for seeding
        const salt = crypto.randomBytes(16).toString("hex");
        const hashedPassword = `admin.${salt}`;
        
        await storage.createAdmin({
          username: "admin",
          password: hashedPassword
        });
        console.log("Created default admin user: admin/admin");
      }
    } catch (error) {
      console.error("Error creating admin:", error);
    }
    
    // Generate visitors and their visits
    for (let i = 0; i < numVisitors; i++) {
      await createVisitorWithVisits(i, numVisitors);
    }
    
    console.log("Database seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}