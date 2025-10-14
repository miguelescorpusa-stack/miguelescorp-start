// src/db.ts
import { Pool } from "pg";

let pool: Pool | null = null;

export function getPool() {
  if (pool) return pool;

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn("DATABASE_URL no definida. La DB no se usará.");
    // Creamos un pool “dummy” que lanza si se intenta usar sin URL.
    throw new Error("DATABASE_URL missing");
  }

  // Neon requiere SSL. Con la URL que tiene ?sslmode=require basta,
  // pero por si acaso añadimos ssl: true (no rompe si ya hay sslmode)
  pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });

  return pool;
}

// helper simple
export async function query<T = any>(text: string, params?: any[]) {
  const p = getPool();
  return p.query<T>(text, params);
}

export default { getPool, query };
