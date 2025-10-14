// src/db.ts
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Missing env.DATABASE_URL');
}

// Vercel + Neon necesitan SSL en Node
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

export async function query<T = any>(sql: string, params?: any[]) {
  const { rows } = await pool.query<T>(sql, params);
  return rows;
}

// Ping de salud (NO se ejecuta en import, solo cuando lo llamamos)
export async function pingDb() {
  const rows = await query<{ now: string }>('SELECT NOW() as now');
  return rows[0];
}

export default { query, pingDb };
