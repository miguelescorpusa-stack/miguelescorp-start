// src/db.ts
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Missing env.DATABASE_URL');
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

export async function query(sql: string, params?: any[]) {
  // ⬇️ sin <T>, devolvemos rows sin genérico para evitar TS2347
  const { rows } = await pool.query(sql, params);
  return rows;
}

export async function pingDb() {
  const rows = await query('SELECT NOW() as now');
  return rows[0];
}

export default { query, pingDb };
