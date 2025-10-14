// src/index.ts
import express, { Request, Response } from 'express';
import cors from 'cors';

import shipmentsRouter from './routes/shipments.js';
import driverRouter from './routes/driver.js';

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
  })
);
app.use(express.json());

// Health
app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true, service: 'Migueles Backend', docs: '/health' });
});

// Rutas
app.use('/api/shipments', shipmentsRouter);
app.use('/api/drivers', driverRouter);

// Raíz (opcional)
app.get('/', (_req, res) => {
  res.type('text').send('Migueles Backend – OK');
});

// Error handler simple
app.use((err: any, _req: Request, res: Response, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ ok: false, error: 'internal_error' });
});

// Export para Vercel serverless
export default app;
