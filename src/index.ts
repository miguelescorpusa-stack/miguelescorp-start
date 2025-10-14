// src/index.ts
import express, { Request, Response } from 'express';
import cors from 'cors';

import shipmentsRouter from './routes/shipments.js';
import driverRouter from './routes/driver.js';

const app = express();
app.use(express.json());

// CORS
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
app.use(cors({ origin: CORS_ORIGIN }));

// Salud
app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true, service: 'Migueles Backend', docs: '/health' });
});

// Rutas
app.use('/shipments', shipmentsRouter);
app.use('/driver', driverRouter);

// Exportar para Vercel
export default app;

// Arranque local (npm run dev)
if (!process.env.VERCEL) {
  const PORT = Number(process.env.PORT || 3000);
  app.listen(PORT, () => console.log(`API local en http://localhost:${PORT}`));
}
