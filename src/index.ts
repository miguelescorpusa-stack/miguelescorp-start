import express from 'express';
import cors from 'cors';
import { query } from './db';

const app = express();
app.use(express.json());
app.use(cors());

// 🩺 Ruta de salud (verificación)
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'Migueles Backend', docs: '/health' });
});

// 🚚 RUTA: Obtener todos los envíos
app.get('/shipments', async (req, res) => {
  try {
    const result = await query('SELECT * FROM shipments ORDER BY created_at DESC');
    res.json({ ok: true, shipments: result.rows });
  } catch (err) {
    console.error('Error al obtener shipments:', err);
    res.status(500).json({ ok: false, error: 'database_error' });
  }
});

// 📍 RUTA: Obtener ubicaciones
app.get('/locations', async (req, res) => {
  try {
    const result = await query('SELECT * FROM locations ORDER BY ts DESC');
    res.json({ ok: true, locations: result.rows });
  } catch (err) {
    console.error('Error al obtener locations:', err);
    res.status(500).json({ ok: false, error: 'database_error' });
  }
});

// 👨‍✈️ RUTA: Obtener conductores
app.get('/driver', async (req, res) => {
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
