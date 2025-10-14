import { Router } from 'express';
import db from '../db.js'; // ¡OJO: extensión .js!

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const { rows } = await db.query('SELECT NOW() AS now');
    res.json({ ok: true, shipments: [], now: rows[0]?.now });
  } catch (err: any) {
    console.error('Error en /shipments:', err?.message || err);
    res.status(500).json({ ok: false, error: err?.message ?? 'shipments_failed' });
  }
});

export default router;
