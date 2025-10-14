import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Pool } from "pg";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";
const DATABASE_URL = process.env.DATABASE_URL || "";

let pool: Pool | null = null;
function getPool(): Pool | null {
  if (!DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      // Neon usa SSL; con sslmode=require esto ya vale, pero este flag evita errores de CA.
      ssl: { rejectUnauthorized: false },
      max: 1,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
    });
  }
  return pool;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    const path = url.pathname;

    if (path === "/health") {
      res.status(200).json({ ok: true, service: "Migueles Backend", docs: "/health" });
      return;
    }

    if (path === "/db-ping") {
      const p = getPool();
      if (!p) {
        res.status(500).json({ ok: false, error: "DATABASE_URL not set" });
        return;
      }
      const r = await p.query("select 1 as ok");
      res.status(200).json({ ok: true, result: r.rows[0] });
      return;
    }

    if (path === "/admin/migrate" && req.method === "POST") {
      // Autorización por token
      if (!ADMIN_TOKEN || (req.headers.authorization || "") !== `Bearer ${ADMIN_TOKEN}`) {
        res.status(401).json({ ok: false, error: "Unauthorized" });
        return;
      }

      const p = getPool();
      if (!p) {
        res.status(500).json({ ok: false, error: "DATABASE_URL not set" });
        return;
      }

      // Migración mínima de ejemplo (ajústala luego a tus tablas reales)
      await p.query(`
        CREATE TABLE IF NOT EXISTS shipments (
          id SERIAL PRIMARY KEY,
          created_at TIMESTAMPTZ DEFAULT now()
        );
      `);

      res.status(200).json({ ok: true, migrated: true });
      return;
    }

    // Raíz
    res.status(200).send("Migueles Backend — OK");
  } catch (err: any) {
    console.error("Handler error:", err);
    res.status(500).json({ ok: false, error: err?.message || "internal" });
  }
}
