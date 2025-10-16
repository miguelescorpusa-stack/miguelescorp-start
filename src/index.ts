// src/index.ts
import express from 'express';
import cors from 'cors';
import { query } from './db.js';

const app = express();
app.use(express.json());
app.use(cors());

// ===== Helpers =====
function assertEnvToken(): string {
  const t = process.env.ADMIN_TOKEN;
  if (!t) throw new Error('Falta ADMIN_TOKEN en variables de entorno');
  return t;
}
function isAuthorized(req: express.Request): boolean {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  return !!token && token === assertEnvToken();
}

// Geocodificación con Nominatim (sin API key)
async function geocode(address: string): Promise<{ lat: number; lon: number }> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', address);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');

  const r = await fetch(url.toString(), {
    headers: { 'User-Agent': 'miguelescorp/1.0 (admin)' },
  });
  const data = await r.json();
  if (!Array.isArray(data) || !data.length) {
    throw new Error('No se pudo geocodificar la dirección');
  }
  return { lat: +data[0].lat, lon: +data[0].lon };
}

// ===== Salud y vistas públicas =====
app.get('/', (_req, res) => {
  res.send(`
    <h2>🚚 Migueles Corp Backend Activo</h2>
    <p>Endpoints disponibles:</p>
    <ul>
      <li><a href="/health">/health</a></li>
      <li><a href="/shipments">/shipments</a></li>
      <li><a href="/locations">/locations</a></li>
      <li><a href="/driver">/driver</a></li>
      <li><a href="/track/TEST-001">/track/TEST-001</a></li>
    </ul>
  `);
});
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'Migueles Backend', docs: '/health' });
});

// ===== Públicas (lectura) =====
app.post('/shipments', async (req, res) => { ... })
  try {
    const result = await query('SELECT * FROM shipments ORDER BY created_at DESC');
    res.json({ ok: true, shipments: result.rows });
  } catch (err) {
    console.error('Error /shipments:', err);
    res.status(500).json({ ok: false, error: 'database_error' });
  }
});
app.get('/locations', async (_req, res) => {
  try {
    const result = await query('SELECT * FROM locations ORDER BY ts DESC');
    res.json({ ok: true, locations: result.rows });
  } catch (err) {
    console.error('Error /locations:', err);
    res.status(500).json({ ok: false, error: 'database_error' });
  }
});
app.get('/driver', async (_req, res) => {
  try {
    const result = await query('SELECT * FROM drivers ORDER BY id ASC');
    res.json({ ok: true, drivers: result.rows });
  } catch (err) {
    console.error('Error /driver:', err);
    res.status(500).json({ ok: false, error: 'database_error' });
  }
});
app.get('/track/:ref_code', async (req, res) => {
  const { ref_code } = req.params;
  try {
    const shipment = await query('SELECT * FROM shipments WHERE ref_code = $1', [ref_code]);
    if (shipment.rowCount === 0) {
      return res.status(404).json({ ok: false, error: 'shipment_not_found' });
    }
    const locations = await query(
      'SELECT lat, lon, ts FROM locations WHERE shipment_ref = $1 ORDER BY ts DESC',
      [ref_code]
    );
    res.json({ ok: true, shipment: shipment.rows[0], locations: locations.rows });
  } catch (err) {
    console.error('Error /track:', err);
    res.status(500).json({ ok: false, error: 'database_error' });
  }
});

// ===== Admin (escritura) — protegido con token =====
app.get('/admin/ping', (req, res) => {
  if (!isAuthorized(req)) return res.status(401).json({ ok: false, error: 'unauthorized' });
  res.json({ ok: true, msg: 'admin ok' });
});

// Upsert de envío
app.post('/admin/shipments/upsert', async (req, res) => {
  if (!isAuthorized(req)) return res.status(401).json({ ok: false, error: 'unauthorized' });
  const { ref_code, tracking_number, status } = req.body || {};
  if (!ref_code || !tracking_number || !status) {
    return res.status(400).json({ ok: false, error: 'missing_fields' });
  }
  try {
    await query(
      `INSERT INTO shipments (ref_code, tracking_number, status)
       VALUES ($1,$2,$3)
       ON CONFLICT (ref_code)
       DO UPDATE SET tracking_number = EXCLUDED.tracking_number,
                     status = EXCLUDED.status`,
      [ref_code, tracking_number, status]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Error upsert shipment:', err);
    res.status(500).json({ ok: false, error: 'database_error' });
  }
});

// Agregar ubicación por lat/lon
app.post('/admin/locations/add', async (req, res) => {
  if (!isAuthorized(req)) return res.status(401).json({ ok: false, error: 'unauthorized' });
  const { shipment_ref, lat, lon } = req.body || {};
  if (!shipment_ref || typeof lat !== 'number' || typeof lon !== 'number') {
    return res.status(400).json({ ok: false, error: 'missing_fields' });
  }
  try {
    await query(
      `INSERT INTO locations (shipment_ref, lat, lon) VALUES ($1,$2,$3)`,
      [shipment_ref, lat, lon]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Error add location:', err);
    res.status(500).json({ ok: false, error: 'database_error' });
  }
});

// Agregar ubicación por dirección (geocode)
app.post('/admin/locations/add-by-address', async (req, res) => {
  if (!isAuthorized(req)) return res.status(401).json({ ok: false, error: 'unauthorized' });
  const { shipment_ref, address } = req.body || {};
  if (!shipment_ref || !address) {
    return res.status(400).json({ ok: false, error: 'missing_fields' });
  }
  try {
    const { lat, lon } = await geocode(address);
    await query(
      `INSERT INTO locations (shipment_ref, lat, lon) VALUES ($1,$2,$3)`,
      [shipment_ref, lat, lon]
    );
    res.json({ ok: true, lat, lon });
  } catch (err:any) {
    console.error('Error add-by-address:', err);
    res.status(500).json({ ok: false, error: err.message || 'geocode_failed' });
  }
});

export default app;
