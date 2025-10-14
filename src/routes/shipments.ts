import { Router } from 'express';
import db from '../db.js';

const router = Router();

// Ejemplo de endpoint
router.get('/', async (_req, res) => {
  const { rows } = await db.query('select now() as now');
  res.json({ shipments: [], now: rows[0].now });
});

export default router;
