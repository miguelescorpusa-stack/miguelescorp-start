import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

/** Crear envío → genera ref_code MC-00xxx */
router.post("/", async (req, res) => {
  try {
    const { pickup_address, delivery_address, assigned_driver } = req.body || {};
    if (!pickup_address || !delivery_address) {
      return res.status(400).json({ error: "pickup_address y delivery_address son requeridos" });
    }

    const q = `
      INSERT INTO shipments (ref_code, pickup_address, delivery_address, status, assigned_driver)
      VALUES (mc_next_ref(), $1, $2, 'created', $3)
      RETURNING ref_code;
    `;
    const { rows } = await pool.query(q, [pickup_address, delivery_address, assigned_driver || null]);

    return res.status(201).json({ ok: true, ref_code: rows[0].ref_code });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/** Tracking simple (estado + última ubicación) */
router.get("/:ref_code/track", async (req, res) => {
  try {
    const { ref_code } = req.params;

    const ship = await pool.query(
      `SELECT ref_code, status, eta, assigned_driver FROM shipments WHERE ref_code=$1`,
      [ref_code]
    );
    if (!ship.rows.length) return res.status(404).json({ error: "No encontrado" });

    const loc = await pool.query(
      `SELECT lat, lon, ts FROM locations WHERE shipment_ref=$1 ORDER BY ts DESC LIMIT 1`,
      [ref_code]
    );

    return res.json({ ...ship.rows[0], location: loc.rows[0] || null });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/** Detalle raw del envío */
router.get("/:ref_code", async (req, res) => {
  try {
    const { ref_code } = req.params;
    const r = await pool.query(`SELECT * FROM shipments WHERE ref_code=$1`, [ref_code]);
    if (!r.rows.length) return res.status(404).json({ error: "No encontrado" });
    return res.json(r.rows[0]);
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
