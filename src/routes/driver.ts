import { Router } from "express";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const { query } = await import("../db.js");
    const { rows } = await query("select 'driver ok' as msg");
    res.json({ ok: true, data: rows[0] });
  } catch (err: any) {
    console.error("drivers error", err?.message || err);
    res.status(500).json({ ok: false, error: "drivers_failed" });
  }
});

export default router;
