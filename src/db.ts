import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL ||
  (() => {
    throw new Error("DATABASE_URL is missing");
  })();

export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }, // Neon requiere SSL
});
