// src/db.ts
import { Pool } from 'pg';

// Debe existir en Vercel → Settings → Environment Variables
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL no está definido en las variables de entorno.');
}

// Muchos proveedores (Neon) requieren SSL, y a veces la cadena ya trae ?sslmode=require.
// Forzamos SSL sin validar CA para entornos serverless.
const needsSSL =
  connectionString.includes('sslmode=require') ||
  connectionString.includes('neon.tech');

// Un pool pequeño funciona mejor en Vercel serverless.
export const pool = new Pool({
  connectionString,
  ssl: needsSSL ? { rejectUnauthorized: false } : undefined,
  max: 1,
});

/**
 * Helper de consulta.
 * OJO: NO usa genéricos. Devuelve lo que `pg` devuelve.
 */
export async function query(text: string, params?: any[]) {
  const res = await pool.query(text, params);
  return res; // { rows, rowCount, ... }
}

// API simple por defecto para importar como `db`
const db = { query };
export default db;
