import express from "express";
import cors from "cors";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import { pool } from "./db.js";
import shipments from "./routes/shipments.js";
import driver from "./routes/driver.js";

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

/** Home HTML */
app.get("/", (_req, res) => {
  res.send(`
    <h1>Migueles Backend</h1>
    <p>🚀 API en funcionamiento.</p>
    <ul>
      <li><a href="/health">/health</a></li>
      <li>POST /api/shipments</li>
      <li>GET /api/shipments/:ref_code/track</li>
      <li>POST /api/driver/location</li>
    </ul>
  `);
});

/** Health */
app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "Migueles Backend", docs: "/health" });
});

/** Rutas API */
app.use("/api/shipments", shipments);
app.use("/api/driver", driver);

/** Ruta protegida para migraciones (una sola vez) */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.post("/admin/migrate", async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.replace("Bearer ", "");
    if (!token || token !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ error: "unauthorized" });
    }

    const initSQL = await fs.readFile(path.join(__dirname, "../sql/001_init.sql"), "utf8");
    const seqSQL  = await fs.readFile(path.join(__dirname, "../sql/002_seq.sql"), "utf8");

    await pool.query(initSQL);
    await pool.query(seqSQL);

    return res.json({ ok: true, migrated: true });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

export default app;

