// src/index.ts
import express from 'express';
import cors from 'cors';

import shipmentsRouter from './routes/shipments.js'; // extensión .js obligatoria
import driverRouter from './routes/driver.js';       // extensión .js obligatoria
import { pingDb } from './db.js';

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.get('/', (_req, res) => {
  res.send('Migueles Backend – OK');
});

app.get('/health', async (_req, res) => {
  try {
    const now = await pingDb();
    res.json({ ok: true, service: 'Migueles Backend', docs: '/health', now: now.now });
  } catch (err: any) {
    console.error('Health error:', err);
    res.status(500).json({ ok: false, error: err?.message || 'health_failed' });
  }
});

app.use('/shipments', shipmentsRouter);
app.use('/driver', driverRouter);

export default app;
