import { Router } from "express";
// 👇 Import local con .js (aunque este archivo sea .ts)
import db from "../db.js";

const router = Router();

// Ejemplo básico: GET /drivers
router.get("/", async (_req, res) => {
  try {
    const { rows } = await db.query("select 'driver ok' as msg");
    res.json({ ok: true, data: rows[0] });
  } catch (err) {
    console.error("drivers error", err);
    res.status(500).json({ ok: false, error: "drivers_failed" });
  }
});

export default router;
