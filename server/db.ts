import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "../shared/schema";

// Initialize Neon client
const sql = neon(process.env.DATABASE_URL!);

// Initialize Drizzle ORM with the PostgreSQL connection
export const db = drizzle(sql, { schema });
