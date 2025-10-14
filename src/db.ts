// src/db.ts
import { Pool } from 'pg';

// Debe existir en Vercel → Settings → Environment Variables
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL no está definido en las variables de entorno.');
}

// Neon usa SSL. En serverless con Vercel, rechazamos CA.
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 1, // pequeño para serverless
});

/**
 * Helper de consulta. Devuelve exactamente lo que devuelve `pg`.
 */
export async function query(text: string, params?: any[]) {
  const res = await pool.query(text, params);
  return res; // { rows, rowCount, ... }
}

// Export por defecto para importar como `db`
const db = { query };
export default db;
