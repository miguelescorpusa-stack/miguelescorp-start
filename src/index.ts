// src/index.ts
import express from 'express';
import cors from 'cors';

// Routers (asegúrate que existen y exportan `export default router`)
import driversRouter from './routes/driver.js';
import shipmentsRouter from './routes/shipments.js';

const app = express();

// CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
  })
);
app.use(express.json());

// ===== Rutas base =====
app.get('/', (_req, res) => {
  res.send('Migueles Backend — OK');
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'Migueles Backend', docs: '/health' });
});

// ===== API =====
app.use('/api/drivers', driversRouter);
app.use('/api/shipments', shipmentsRouter);

// ===== Admin (migraciones básicas, protegido por token) =====
app.post('/admin/migrate', (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');

  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  // Aquí irían sentencias CREATE TABLE IF NOT EXISTS, etc.,
  // usando tu helper de DB. Por ahora lo dejamos “no-op”.
  return res.json({ ok: true, ran: [], note: 'migrations placeholder' });
});

export default app;
