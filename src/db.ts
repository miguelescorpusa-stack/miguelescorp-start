// src/db.ts
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

// Vercel + Neon: SSL requerido
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function query(text: string, params?: any[]) {
  return pool.query(text, params);
}

export default { query };
