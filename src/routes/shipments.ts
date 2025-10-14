import { Router } from 'express';
import db from '../db.js'; // 👈 Import con extensión .js obligatoria

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const { rows } = await db.query('SELECT now() AS now');
    res.json({ ok: true, shipments: [], now: rows[0].now });
  } catch (err: any) {
    console.error('Error en /shipments:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
