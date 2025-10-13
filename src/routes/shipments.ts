import { Router } from "express";
import { pool } from "../db";

const router = Router();

/** util: genera ref_code tipo mc_ab12cd34 */
function genRef(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `mc_${rand}`;
}

/** Crear envío: devuelve ref_code */
router.post("/", async (req, res) => {
  try {
    const { pickup_address, delivery_address, assigned_driver } = req.body || {};
    if (!pickup_address || !delivery_address) {
      return res
        .status(400)
        .json({ error: "pickup_address y delivery_address son requeridos" });
    }

    const refCode = genRef();

    const q = `
      INSERT INTO shipments (ref_code, pickup_address, delivery_address, status, assigned_driver)
      VALUES ($1, $2, $3, 'created', $4)
      RETURNING ref_code
    `;
    const { rows } = await pool.query(q, [
      refCode,
      pickup_address,
      delivery_address,
      assigned_driver || null,
    ]);

    res.status(201).json({ ref_code: rows[0].ref_code });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "create_shipment_failed" });
  }
});

/** Obtener envío por ref_code */
router.get("/:ref", async (req, res) => {
  try {
    const ref = req.params.ref;
    const q = `SELECT * FROM shipments WHERE ref_code = $1`;
    const { rows } = await pool.query(q, [ref]);
    if (!rows.length) return res.status(404).json({ error: "not_found" });
    res.json(rows[0]);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "get_shipment_failed" });
  }
});

/** Agregar punto de tracking (lat, lon) */
router.post("/:ref/track", async (req, res) => {
  try {
    const ref = req.params.ref;
    const { lat, lon } = req.body || {};
    if (typeof lat !== "number" || typeof lon !== "number") {
      return res.status(400).json({ error: "lat y lon numéricos son requeridos" });
    }
    const q = `
      INSERT INTO locations (shipment_ref, lat, lon)
      VALUES ($1, $2, $3)
      RETURNING id, ts
    `;
    const { rows } = await pool.query(q, [ref, lat, lon]);
    res.status(201).json({ ok: true, track_id: rows[0].id, ts: rows[0].ts });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "track_insert_failed" });
  }
});

/** Última ubicación pública por ref_code */
router.get("/:ref/track", async (req, res) => {
  try {
    const ref = req.params.ref;
    const q = `
      SELECT lat, lon, ts
      FROM locations
      WHERE shipment_ref = $1
      ORDER BY ts DESC
      LIMIT 1
    `;
    const { rows } = await pool.query(q, [ref]);
    if (!rows.length) return res.status(404).json({ error: "no_tracking" });
    res.json(rows[0]);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "track_get_failed" });
  }
});

export default router;
