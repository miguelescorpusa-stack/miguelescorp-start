import express from "express";
import cors from "cors";
import { pool } from "./db.js";

const app = express(); // ← ESTA LÍNEA ES CLAVE
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ ok: true, service: "Migueles Backend", docs: "/health" });
});

// --- Ejemplo de rutas ---
app.post("/api/shipments", async (req, res) => {
  try {
    const { pickup_address, delivery_address, assigned_driver } = req.body;
    const ref = "MC-" + Math.floor(Math.random() * 1000).toString().padStart(4, "0");
    await pool.query(
      "INSERT INTO shipments(ref_code, pickup_address, delivery_address, assigned_driver) VALUES ($1,$2,$3,$4)",
      [ref, pickup_address.text, delivery_address.text, assigned_driver]
    );
    res.json({ ok: true, ref });
  } catch (e:any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// --- Ruta protegida para migrar ---
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.post("/admin/migrate", async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.replace("Bearer ", "");
    if (token !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ error: "unauthorized" });
    }
    const sql1 = await fs.readFile(path.join(__dirname, "../sql/001_init.sql"), "utf8");
    const sql2 = await fs.readFile(path.join(__dirname, "../sql/002_seq.sql"), "utf8");
    await pool.query(sql1);
    await pool.query(sql2);
    res.json({ ok: true, migrated: true });
  } catch (e:any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Exporta para Vercel
export default app;
