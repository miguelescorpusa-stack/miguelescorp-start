import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL no está configurada en las variables de entorno de Vercel.');
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false } // Neon requiere SSL
});

export async function pingDb(): Promise<boolean> {
  const r = await pool.query('select 1 as ok');
  return r.rows?.[0]?.ok === 1;
}

export default pool;
