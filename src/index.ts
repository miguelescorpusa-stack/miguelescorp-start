import express from 'express';
import cors from 'cors';

import shipmentsRouter from './routes/shipments.js';
import driverRouter from './routes/driver.js';

const app = express();
app.use(express.json());

const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({ origin: corsOrigin }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'Migueles Backend', docs: '/health' });
});

app.use('/api/shipments', shipmentsRouter);
app.use('/api/drivers', driverRouter);

const port = Number(process.env.PORT ?? 3000);
if (process.env.VERCEL) {
  export default app;
} else {
  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}
