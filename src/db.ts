import pkg from "pg";
const { Pool } = pkg;

const DATABASE_URL = process.env.DATABASE_URL!;
export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl:
    DATABASE_URL.includes("neon.tech") ||
    DATABASE_URL.includes("supabase.co") ||
    DATABASE_URL.includes("sslmode=require")
      ? { rejectUnauthorized: false }
      : undefined
});
