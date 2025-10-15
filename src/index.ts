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
  return token && token === assertEnvToken();
}

// Geocodificación con Nominatim (sin API key)
async function geocode(address: string): Promise<{ lat: number; lon: number }> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', address);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');

  const r = await fetch(url, {
    headers: {
      // Nominatim exige un User-Agent identificable
      'User-Agent': 'miguelescorp-backend/1.0 (contacto: admin@miguelescorp.com)',
    },
  });
  if (!r.ok) throw new Error(`Geocoding error HTTP ${r.status}`);
  const data = (await r.json()) as Array<{ lat: string; lon: string }>;
  if (!data.length) throw new Error('No se encontraron coordenadas para esa dirección');
  const { lat, lon } = data[0];
  return { lat: Number(lat), lon: Number(lon) };
}

// ===== Página raíz sencilla =====
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

// 🩺 Salud
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'Migueles Backend', docs: '/health' });
});

// ===== API públicas (consulta) =====
app.get('/shipments', async (_req, res) => {
  try {
    const result = await query('SELECT * FROM shipments ORDER BY created_at DESC');
    res.json({ ok: true, shipments: result.rows });
  } catch (err) {
    console.error('Error al obtener shipments:', err);
    res.status(500).json({ ok: false, error: 'database_error' });
  }
});

app.get('/locations', async (_req, res) => {
  try {
    const result = await query('SELECT * FROM locations ORDER BY ts DESC');
    res.json({ ok: true, locations: result.rows });
  } catch (err) {
    console.error('Error al obtener locations:', err);
    res.status(500).json({ ok: false, error: 'database_error' });
  }
});

app.get('/driver', async (_req, res) => {
  try {
    const result = await query('SELECT * FROM drivers ORDER BY id ASC');
    res.json({ ok: true, drivers: result.rows });
  } catch (err) {
    console.error('Error al obtener drivers:', err);
    res.status(500).json({ ok: false, error: 'database_error' });
  }
});

// Seguimiento por código (lo usa tu mapa)
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

// ===== Admin (crear en el momento del contrato) =====

// Crear envío
app.post('/admin/shipments', async (req, res) => {
  try {
    if (!isAuthorized(req)) return res.status(401).json({ ok: false, error: 'unauthorized' });

    const { ref_code, tracking_number, status } = req.body || {};
    if (!ref_code || !tracking_number) {
      return res.status(400).json({ ok: false, error: 'missing_fields' });
    }
    await query(
      `INSERT INTO shipments (ref_code, tracking_number, status)
       VALUES ($1,$2,COALESCE($3,'pending'))
       ON CONFLICT (ref_code) DO NOTHING`,
      [ref_code, tracking_number, status || 'pending']
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Error /admin/shipments:', err);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
});

// Añadir ubicación por dirección (geocodifica y guarda)
app.post('/admin/locations-by-address', async (req, res) => {
  try {
    if (!isAuthorized(req)) return res.status(401).json({ ok: false, error: 'unauthorized' });

    const { shipment_ref, address } = req.body || {};
    if (!shipment_ref || !address) {
      return res.status(400).json({ ok: false, error: 'missing_fields' });
    }

    // 1) Geocodificar
    const { lat, lon } = await geocode(address);

    // 2) Guardar
    await query(
      'INSERT INTO locations (shipment_ref, lat, lon) VALUES ($1,$2,$3)',
      [shipment_ref, lat, lon]
    );

    res.json({ ok: true, geocoded: { lat, lon } });
  } catch (err: any) {
    console.error('Error /admin/locations-by-address:', err);
    res.status(500).json({ ok: false, error: err?.message || 'server_error' });
  }
});

export default app;
