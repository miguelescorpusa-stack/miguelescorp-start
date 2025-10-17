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
app.get('/shipments', async (_req, res) => {
  try {
    const result = await query('SELECT * FROM shipments ORDER BY created_at DESC');
    res.json({ ok: true, shipments: result.rows });
  } catch (err) {
    console.error('Error /shipments:', err);
    res.status(500).json({ ok: false, error: 'database_error' });
  }
});

// ===== NUEVO: Pública (escritura sin token) =====
app.post('/shipments', async (req, res) => {
  const { ref_code, tracking_number, status } = req.body || {};
  if (!ref_code || !tracking_number || !status) {
    return res.status(400).json({ ok: false, error: 'missing_fields' });
  }

  try {
    const result = await query(
      `INSERT INTO shipments (ref_code, tracking_number, status)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [ref_code, tracking_number, status]
    );

    res.status(201).json({ ok: true, shipment: result.rows[0] });
  } catch (err: any) {
    console.error('Error POST /shipments:', err);
    res.status(500).json({ ok: false, error: 'database_error' });
  }
});

// ===== Públicas (otras lecturas) =====
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

// ===== Pública (escritura sin token) — Upsert por tracking_seq con rotación 1..10000 =====
app.post('/shipments', async (req, res) => {
  try {
    let { ref_code, status, destination_address, tracking_seq } = req.body || {};
    if (!ref_code || !status || !destination_address) {
      return res.status(400).json({ ok: false, error: 'missing_fields' });
    }

    // 1) Geocodificar destino
    const { lat: dest_lat, lon: dest_lon } = await geocode(destination_address);

    // 2) Asignar tracking_seq si no vino
    if (!tracking_seq) {
      // lee y avanza puntero; rota 1..10000
      const row = await query('SELECT pointer FROM next_seq WHERE id=1');
      let p = Number(row.rows[0]?.pointer ?? 0);
      let attempts = 0;
      let candidate = 0;

      while (attempts < 10000) {
        p = (p % 10000) + 1;
        const check = await query(
          "SELECT 1 FROM shipments WHERE tracking_seq = $1 AND status <> 'delivered' LIMIT 1",
          [p]
        );
        if (check.rowCount === 0) { candidate = p; break; }
        attempts++;
      }
      if (!candidate) return res.status(409).json({ ok: false, error: 'no_free_seq' });

      tracking_seq = candidate;
      await query('UPDATE next_seq SET pointer = $1 WHERE id = 1', [tracking_seq]);
    } else {
      // validar rango
      tracking_seq = Number(tracking_seq);
      if (!(tracking_seq >= 1 && tracking_seq <= 10000)) {
        return res.status(400).json({ ok: false, error: 'seq_out_of_range' });
      }
      // si viene forzado, verificar que no esté ocupado por un envío activo
      const active = await query(
        "SELECT 1 FROM shipments WHERE tracking_seq = $1 AND status <> 'delivered' LIMIT 1",
        [tracking_seq]
      );
      if (active.rowCount > 0) {
        return res.status(409).json({ ok: false, error: 'seq_in_use' });
      }
    }

    // 3) Intentar reutilizar si existe ese seq pero entregado; si no, crear nuevo
    const existing = await query(
      'SELECT id FROM shipments WHERE tracking_seq = $1 ORDER BY created_at DESC LIMIT 1',
      [tracking_seq]
    );

    let result;
    if (existing.rowCount > 0) {
      // reutiliza registro anterior (entregado) actualizando datos
      result = await query(
        `UPDATE shipments
           SET ref_code = $1,
               tracking_number = CONCAT('MC-', LPAD($2::text, 6, '0')), -- opcional si usas ambos
               status = $3,
               destination_address = $4,
               dest_lat = $5,
               dest_lon = $6,
               created_at = NOW()
         WHERE id = $7
         RETURNING *`,
        [ref_code, tracking_seq, status, destination_address, dest_lat, dest_lon, existing.rows[0].id]
      );
      return res.status(200).json({ ok: true, shipment: result.rows[0] });
    } else {
      // crear nuevo
      result = await query(
        `INSERT INTO shipments
           (ref_code, tracking_seq, tracking_number, status, destination_address, dest_lat, dest_lon)
         VALUES
           ($1, $2, CONCAT('MC-', LPAD($2::text, 6, '0')), $3, $4, $5, $6)
         RETURNING *`,
        [ref_code, tracking_seq, status, destination_address, dest_lat, dest_lon]
      );
      return res.status(201).json({ ok: true, shipment: result.rows[0] });
    }
  } catch (err) {
    console.error('Error POST /shipments:', err);
    // 409 si index parcial impide duplicado activo
    const msg = (err as any)?.message || '';
    if (msg.includes('ux_shipments_tracking_seq_active')) {
      return res.status(409).json({ ok: false, error: 'seq_in_use' });
    }
    return res.status(500).json({ ok: false, error: 'database_error' });
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
  } catch (err: any) {
    console.error('Error add-by-address:', err);
    res.status(500).json({ ok: false, error: err.message || 'geocode_failed' });
  }
});

export default app;
