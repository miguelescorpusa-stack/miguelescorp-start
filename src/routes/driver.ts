import { Router } from "express";
import { pool } from "../db";

const router = Router();

/** Crear driver */
router.post("/", async (req, res) => {
  try {
    const { name, phone } = req.body || {};
    if (!name) return res.status(400).json({ error: "name requerido" });

    const q = `
      INSERT INTO drivers (name, phone)
      VALUES ($1, $2)
      RETURNING id, name, phone, active, created_at
    `;
    const { rows } = await pool.query(q, [name, phone || null]);
    res.status(201).json(rows[0]);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "driver_create_failed" });
  }
});

/** Listar drivers activos */
router.get("/", async (_req, res) => {
  try {
    const q = `SELECT id, name, phone, active, created_at FROM drivers WHERE active = TRUE ORDER BY id DESC`;
    const { rows } = await pool.query(q);
    res.json(rows);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "drivers_list_failed" });
  }
});

export default router;
