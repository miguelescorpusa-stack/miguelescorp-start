import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

/** Registrar/simular ubicación del conductor */
router.post("/location", async (req, res) => {
  try {
    const { ref_code, lat, lon } = req.body || {};
    if (!ref_code || typeof lat !== "number" || typeof lon !== "number") {
      return res.status(400).json({ error: "ref_code, lat, lon son requeridos" });
    }

    await pool.query(
      `INSERT INTO locations (shipment_ref, lat, lon) VALUES ($1,$2,$3)`,
      [ref_code, lat, lon]
    );

    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
