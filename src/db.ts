import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
  // En Neon la cadena ya trae sslmode=require; no necesitas más opciones aquí.
});

export default pool;
