// src/db.ts
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Si usas Neon, la cadena ya trae sslmode=require; si NO, descomenta:
  // ssl: { rejectUnauthorized: false }
});

export type Row = Record<string, unknown>;

/**
 * Query tipado. Permite usar genéricos: query<{ now: string }>('select now() as now');
 */
export async function query<T extends Row = Row>(
  text: string,
  params: unknown[] = []
): Promise<{ rows: T[] }> {
  const res = await pool.query(text, params);
  return { rows: res.rows as T[] };
}

/** Cierra el pool si alguna vez lo necesitas (no se usa en serverless normal). */
export async function close(): Promise<void> {
  await pool.end();
}

export default { query };
