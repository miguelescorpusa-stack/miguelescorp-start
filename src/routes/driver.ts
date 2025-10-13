import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

router.get("/drivers", async (_req, res) => {
  const { rows } = await pool.query("SELECT id, name FROM drivers LIMIT 50");
  res.json(rows);
});

export default router;
