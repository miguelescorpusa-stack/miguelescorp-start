import express from 'express';
import cors from 'cors';
import { query } from './db.js';

const app = express();
app.use(express.json());
app.use(cors());

// 🏁 Página principal (evita el "Cannot GET /")
app.get('/', (_req, res) => {
  res.send(`
    <h2>🚚 Migueles Corp Backend Activo</h2>
    <p>Endpoints disponibles:</p>
    <ul>
      <li><a href="/health">/health</a></li>
      <li><a href="/shipments">/shipments</a></li>
      <li><a href="/locations">/locations</a></li>
      <li><a href="/track/TEST-001">/track/TEST-001</a></li>
    </ul>
  `);
});

// 🩺 Ruta de salud (verificación)
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'Migueles Backend', docs: '/health' });
});

// 🚚 RUTA: Obtener todos los envíos
app.get('/shipments', async (_req, res) => {
  try {
    const result = await query('SELECT * FROM shipments ORDER BY created_at DESC');
    res.json({ ok: true, shipments: result.rows });
  } catch (err) {
    console.error('Error al obtener shipments:', err);
    res.status(500).json({ ok: false, error: 'database_error' });
  }
});

// 📍 RUTA: Obtener ubicaciones
app.get('/locations', async (_req, res) => {
  try {
    const result = await query('SELECT * FROM locations ORDER BY ts DESC');
    res.json({ ok: true, locations: result.rows });
  } catch (err) {
    console.error('Error al obtener locations:', err);
    res.status(500).json({ ok: false, error: 'database_error' });
  }
});

// 👨‍✈️ RUTA: Obtener conductores
app.get('/driver', async (_req, res) => {
  try {
    const result = await query('SELECT * FROM drivers ORDER BY id ASC');
    res.json({ ok: true, drivers: result.rows });
  } catch (err) {
    console.error('Error al obtener drivers:', err);
    res.status(500).json({ ok: false, error: 'database_error' });
  }
});

// 🌍 RUTA: Seguimiento por código de envío (para clientes)
app.get('/track/:ref_code', async (req, res) => {
  const { ref_code } = req.params;
  try {
    const shipment = await query(
      'SELECT * FROM shipments WHERE ref_code = $1',
      [ref_code]
    );
    if (shipment.rowCount === 0) {
      return res.status(404).json({ ok: false, error: 'shipment_not_found' });
    }

    const locations = await query(
      'SELECT lat, lon, ts FROM locations WHERE shipment_ref = $1 ORDER BY ts DESC',
      [ref_code]
    );

    res.json({
      ok: true,
      shipment: shipment.rows[0],
      locations: locations.rows,
    });
  } catch (err) {
    console.error('Error en /track/:ref_code:', err);
    res.status(500).json({ ok: false, error: 'database_error' });
  }
});

export default app;
