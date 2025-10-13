import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL no está definida en las variables de entorno.");
}

export const pool = new Pool({
  connectionString,
  // Neon requiere SSL
  ssl: { rejectUnauthorized: false }
});
