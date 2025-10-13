import express, { Request, Response } from "express";
import cors from "cors";
import { Pool } from "pg";

// ---- Config ----
const PORT = Number(process.env.PORT || 3000);
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const DATABASE_URL = process.env.DATABASE_URL || "";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";

// ---- DB ----
const pool = DATABASE_URL
  ? new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : (null as unknown as Pool);

// ---- App ----
const app = express();
app.use(express.json());
app.use(cors({ origin: CORS_ORIGIN }));

app.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true, service: "Migueles Backend", docs: "/health" });
});

// Ejemplo de endpoint protegido para correr migraciones simples (opcional)
app.post("/admin/migrate", async (req: Request, res: Response) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.replace("Bearer ", "");
    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
      return res.status(401).json({ error: "unauthorized" });
    }
    if (!pool) return res.status(200).json({ ok: true, note: "DB not configured" });

    // Crea tablas mínimas si no existen
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shipments (
        id SERIAL PRIMARY KEY,
        ref_code TEXT UNIQUE,
        pickup_address JSONB,
        delivery_address JSONB,
        status TEXT DEFAULT 'created',
        eta TEXT,
        assigned_driver TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS locations (
        id SERIAL PRIMARY KEY,
        shipment_ref TEXT,
        lat FLOAT,
        lon FLOAT,
        ts TIMESTAMPTZ DEFAULT now()
      );
    `);

    // Secuencia MC-00xxx si no existe
    await pool.query(`
      CREATE SEQUENCE IF NOT EXISTS mc_ref_seq START 201;
    `);

    res.json({ ok: true, migrated: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "migration_failed", detail: err?.message });
  }
});

// 404 friendly
app.use((req, res) => {
  res.status(404).json({ error: "not_found", path: req.path });
});

// Export para Vercel
export default app;

// Soporte local (npm run dev)
if (process.env.VERCEL !== "1") {
  app.listen(PORT, () => console.log(`API local en http://localhost:${PORT}`));
}
