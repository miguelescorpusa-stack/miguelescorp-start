import { Router } from "express";
import { pool } from "../db.js";

export default function driverRoutes(emitLocation: (ref: string, payload: any) => void) {
  const router = Router();

  /** Simular/registrar ubicación de un conductor y emitir en tiempo real */
  router.post("/location", async (req, res) => {
    const { ref_code, lat, lon } = req.body || {};
    if (!ref_code || typeof lat !== "number" || typeof lon !== "number") {
      return res.status(400).json({ error: "ref_code, lat, lon son requeridos" });
    }
    await pool.query(`INSERT INTO locations (shipment_ref, lat, lon) VALUES ($1,$2,$3)`,
      [ref_code, lat, lon]);

    emitLocation(ref_code, { lat, lon, ts: new Date().toISOString() });
    res.json({ ok: true });
  });

  return router;
}
