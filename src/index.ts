import express from "express";
import cors from "cors";
import { pool } from "./db.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(express.json());

// --- Configuración de rutas ---
app.get("/", (req, res) => {
  res.send(`
    <h1>Migueles Backend</h1>
    <p>🚀 API en funcionamiento.</p>
    <ul>
      <li><a href="/health">Ver estado del servicio</a></li>
      <li>Endpoints activos:</li>
      <ul>
        <li>/api/shipments</li>
        <li>/api/driver/location</li>
      </ul>
    </ul>
  `);
});

// --- Health check ---
app.get("/health", (req, res) => {
  res.json({ ok: true, service: "Migueles Backend", docs: "/health" });
});

// --- Crear nuevo envío ---
app.post("/api/shipments", async (req, res) => {
  try {
    const { pickup_address, delivery_address, assigned_driver } = req.body;

    if (!pickup_address || !delivery_address) {
      return res.status(400).json({ error: "pickup_address y delivery_address son requeridos" });
    }

    const ref = "MC-" + Math.floor(Math.random() * 10000).toString().padStart(4, "0");

    await pool.query(
      "INSERT INTO shipments (ref_code, pickup_address, delivery_address, assigned_driver, status) VALUES ($1, $2, $3, $4, 'created')",
      [ref, pickup_address, delivery_address, assigned_driver]
    );

    res.status(201).json({ ok: true, ref_code: ref });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// --- Obtener estado de envío por ref_code ---
app.get("/api/shipments/:ref_code", async (req, res) => {
  try {
    const { ref_code } = req.params;
    const result = await pool.query("SELECT * FROM shipments WHERE ref_code = $1", [ref_code]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Envío no encontrado" });
    }

    res.json(result.rows[0]);
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// --- Migración admin (crea tablas en la base de datos) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.post("/admin/migrate", async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.replace("Bearer ", "");

    if (token !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const initSQL = await fs.readFile(path.join(__dirname, "../sql/001_init.sql"), "utf8");
    const seqSQL = await fs.readFile(path.join(__dirname, "../sql/002_seq.sql"), "utf8");

    await pool.query(initSQL);
    await pool.query(seqSQL);

    res.json({ ok: true, migrated: true });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// --- Exportar app para Vercel ---
export default app;
