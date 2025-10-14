import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', async (_req, res) => {
  const { rows } = await db.query('select now() as now');
  res.json({ drivers: [], now: rows[0].now });
});

export default router;
