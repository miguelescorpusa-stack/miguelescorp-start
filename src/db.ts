import pkg from "pg";
const { Pool } = pkg;

const DATABASE_URL = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/migueles";

export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes("neon.tech") || DATABASE_URL.includes("supabase.co")
       ? { rejectUnauthorized: false } : undefined
});
