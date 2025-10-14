import express from 'express';
import cors from 'cors';

import shipmentsRouter from './routes/shipments.js';
import driverRouter from './routes/driver.js';

const app = express();

app.use(express.json());

const origin = process.env.CORS_ORIGIN || '*';
app.use(
  cors({
    origin: origin === '*' ? true : origin
  })
);

// Salud del servicio
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'Migueles Backend', docs: '/health' });
});

// Ping a DB (útil para probar conexión)
import { pingDb } from './db.js';
app.get('/db-ping', async (_req, res) => {
  try {
    const ok = await pingDb();
    res.json({ ok });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message });
  }
});

// Rutas de negocio
app.use('/shipments', shipmentsRouter);
app.use('/driver', driverRouter);

// Export default para Serverless (Vercel)
export default app;
