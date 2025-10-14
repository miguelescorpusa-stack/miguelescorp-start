import { Router } from "express";
// 👇 Import local con .js (aunque este archivo sea .ts)
import db from "../db.js";

const router = Router();

// Ejemplo básico: GET /shipments
router.get("/", async (_req, res) => {
  try {
    const { rows } = await db.query("select 'shipments ok' as msg");
    res.json({ ok: true, data: rows[0] });
  } catch (err) {
    console.error("shipments error", err);
    res.status(500).json({ ok: false, error: "shipments_failed" });
  }
});

export default router;
