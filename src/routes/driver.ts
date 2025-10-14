import { Router } from 'express';
import db from '../db.js'; // 👈 con .js

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const { rows } = await db.query<{ now: string }>('SELECT now() AS now');
    res.json({ ok: true, drivers: [], now: rows[0]?.now });
  } catch (err: any) {
    console.error('Error en /driver:', err?.message || err);
    res.status(500).json({ ok: false, error: err?.message ?? 'driver_failed' });
  }
});

export default router;
