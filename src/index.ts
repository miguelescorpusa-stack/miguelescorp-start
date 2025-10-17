// src/index.ts
import express from "express";
import cors from "cors";
import { query } from "./db.js";

// -----------------------------------------------------------------------------
// APP
// -----------------------------------------------------------------------------
const app = express();
app.use(express.json());
app.use(
  cors({
    origin: [
      "https://miguelescorp-frontend.vercel.app",
      "https://www.miguelescorp.com",
      "https://miguelescorp.com",
    ],
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
function assertEnvToken(): string {
  const t = process.env.ADMIN_TOKEN;
  if (!t) throw new Error("Falta ADMIN_TOKEN en variables de entorno");
  return t;
}
function isAuthorized(req: express.Request): boolean {
  const auth = req.headers.authorization || "";
  const token = auth.replace("Bearer ", "");
  return !!token && token === assertEnvToken();
}
function normalizeStatus(s: string): string {
  return String(s || "").toLowerCase().trim().replace(/\s+/g, "_");
}

// Geocodificación con Nominatim (sin API key)
async function geocode(address: string): Promise<{ lat: number; lon: number }> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", address);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  const r = await fetch(url.toString(), {
    headers: { "User-Agent": "miguelescorp/1.0 (admin)" },
  });
  const data = await r.json();
  if (!Array.isArray(data) || !data.length) {
    throw new Error("No se pudo geocodificar la dirección");
  }
  return { lat: +data[0].lat, lon: +data[0].lon };
}

// Asegura tabla/registro de puntero para la rotación 1..10000
async function ensureNextSeq(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS next_seq (
      id INT PRIMARY KEY DEFAULT 1,
      pointer INT NOT NULL DEFAULT 0
    );
  `);
  await query(`
    INSERT INTO next_seq (id, pointer)
    VALUES (1, 0)
    ON CONFLICT (id) DO NOTHING;
  `);
}

// Busca el siguiente tracking_seq libre (1..10000, rotando)
async function nextAvailableSeq(): Promise<number> {
  await ensureNextSeq();
  const row = await query("SELECT pointer FROM next_seq WHERE id=1");
  let p = Number(row.rows[0]?.pointer ?? 0);

  let attempts = 0;
  let candidate = 0;

  while (attempts < 10000) {
    p = (p % 10000) + 1;
    const check = await query(
      "SELECT 1 FROM shipments WHERE tracking_seq = $1 AND status <> 'delivered' LIMIT 1",
      [p]
    );
    if (check.rowCount === 0) {
      candidate = p;
      break;
    }
    attempts++;
  }

  if (!candidate) throw new Error("no_free_seq");

  await query("UPDATE next_seq SET pointer = $1 WHERE id = 1", [candidate]);
  return candidate;
}

// -----------------------------------------------------------------------------
// Salud y vistas públicas
// -----------------------------------------------------------------------------
app.get("/", (_req, res) => {
  res.send(`
    <h2>🚚 Migueles Corp Backend Activo</h2>
    <p>Endpoints disponibles:</p>
    <ul>
      <li><a href="/health">/health</a></li>
      <li><a href="/shipments">/shipments</a></li>
      <li><a href="/locations">/locations</a></li>
      <li><a href="/driver">/driver</a></li>
      <li><a href="/track/TEST-001">/track/TEST-001</a></li>
      <li><a href="/track-seq/1">/track-seq/:seq</a></li>
    </ul>
  `);
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "Migueles Backend", docs: "/health" });
});

// -----------------------------------------------------------------------------
// Públicas (lectura)
// -----------------------------------------------------------------------------
app.get("/shipments", async (_req, res) => {
  try {
    const result = await query(
      "SELECT * FROM shipments ORDER BY created_at DESC"
    );
    res.json({ ok: true, shipments: result.rows });
  } catch (err) {
    console.error("Error /shipments:", err);
    res.status(500).json({ ok: false, error: "database_error" });
  }
});

app.get("/locations", async (_req, res) => {
  try {
    const result = await query(
      "SELECT * FROM locations ORDER BY ts DESC"
    );
    res.json({ ok: true, locations: result.rows });
  } catch (err) {
    console.error("Error /locations:", err);
    res.status(500).json({ ok: false, error: "database_error" });
  }
});

app.get("/driver", async (_req, res) => {
  try {
    const result = await query("SELECT * FROM drivers ORDER BY id ASC");
    res.json({ ok: true, drivers: result.rows });
  } catch (err) {
    console.error("Error /driver:", err);
    res.status(500).json({ ok: false, error: "database_error" });
  }
});

// RASTREO POR REF_CODE (actual)
app.get("/track/:ref_code", async (req, res) => {
  const { ref_code } = req.params;
  try {
    const shipment = await query(
      "SELECT * FROM shipments WHERE ref_code = $1",
      [ref_code]
    );
    if (shipment.rowCount === 0) {
      return res.status(404).json({ ok: false, error: "shipment_not_found" });
    }
    const locations = await query(
      "SELECT lat, lon, ts FROM locations WHERE shipment_ref = $1 ORDER BY ts DESC",
      [ref_code]
    );
    res.json({
      ok: true,
      shipment: shipment.rows[0],
      locations: locations.rows,
    });
  } catch (err) {
    console.error("Error /track:", err);
    res.status(500).json({ ok: false, error: "database_error" });
  }
});

// NUEVO: RASTREO POR NÚMERO 1..10000 (cliente)
app.get("/track-seq/:seq", async (req, res) => {
  const seq = Number(req.params.seq);
  if (!(seq >= 1 && seq <= 10000)) {
    return res.status(400).json({ ok: false, error: "seq_out_of_range" });
  }
  try {
    const ship = await query(
      "SELECT * FROM shipments WHERE tracking_seq = $1 AND status <> $2 ORDER BY created_at DESC LIMIT 1",
      [seq, "delivered"]
    );
    if (ship.rowCount === 0) {
      return res.status(404).json({ ok: false, error: "shipment_not_found" });
    }
    const ref = ship.rows[0].ref_code;
    const locs = await query(
      "SELECT lat, lon, ts FROM locations WHERE shipment_ref = $1 ORDER BY ts DESC",
      [ref]
    );
    res.json({ ok: true, shipment: ship.rows[0], locations: locs.rows });
  } catch (err) {
    console.error("Error /track-seq:", err);
    res.status(500).json({ ok: false, error: "database_error" });
  }
});

// -----------------------------------------------------------------------------
// Pública (escritura) — Upsert por tracking_seq con rotación 1..10000 + destino
// -----------------------------------------------------------------------------
app.post("/shipments", async (req, res) => {
  try {
    let {
      ref_code,
      status,
      destination_address,
      tracking_seq,
    }: {
      ref_code?: string;
      status?: string;
      destination_address?: string;
      tracking_seq?: number;
    } = req.body || {};

    if (!ref_code || !status || !destination_address) {
      return res.status(400).json({ ok: false, error: "missing_fields" });
    }

    // normalizar estado
    status = normalizeStatus(status);

    // 1) Geocodificar destino
    const { lat: dest_lat, lon: dest_lon } = await geocode(destination_address);

    // 2) Asignar tracking_seq si no vino; si vino, validar y chequear ocupación.
    if (tracking_seq == null) {
      tracking_seq = await nextAvailableSeq();
    } else {
      tracking_seq = Number(tracking_seq);
      if (!(tracking_seq >= 1 && tracking_seq <= 10000)) {
        return res.status(400).json({ ok: false, error: "seq_out_of_range" });
      }
      const active = await query(
        "SELECT 1 FROM shipments WHERE tracking_seq = $1 AND status <> 'delivered' LIMIT 1",
        [tracking_seq]
      );
      if (active.rowCount > 0) {
        return res.status(409).json({ ok: false, error: "seq_in_use" });
      }
    }

    // 3) Reutilizar si existe ese seq pero entregado; si no, crear nuevo
    const existing = await query(
      "SELECT id FROM shipments WHERE tracking_seq = $1 ORDER BY created_at DESC LIMIT 1",
      [tracking_seq]
    );

    const padded = String(tracking_seq).padStart(6, "0");
    const tracking_number = `MC-${padded}`;

    if (existing.rowCount > 0) {
      const result = await query(
        `UPDATE shipments
           SET ref_code = $1,
               tracking_number = $2,
               status = $3,
               destination_address = $4,
               dest_lat = $5,
               dest_lon = $6,
               created_at = NOW()
         WHERE id = $7
         RETURNING *`,
        [
          ref_code,
          tracking_number,
          status,
          destination_address,
          dest_lat,
          dest_lon,
          existing.rows[0].id,
        ]
      );
      return res.status(200).json({ ok: true, shipment: result.rows[0] });
    } else {
      const result = await query(
        `INSERT INTO shipments
           (ref_code, tracking_seq, tracking_number, status, destination_address, dest_lat, dest_lon)
         VALUES
           ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          ref_code,
          tracking_seq,
          tracking_number,
          status,
          destination_address,
          dest_lat,
          dest_lon,
        ]
      );
      return res.status(201).json({ ok: true, shipment: result.rows[0] });
    }
  } catch (err: any) {
    console.error("Error POST /shipments:", err);
    const msg = err?.message || "";
    if (msg.includes("no_free_seq")) {
      return res.status(409).json({ ok: false, error: "no_free_seq" });
    }
    if (msg.includes("ux_shipments_tracking_seq_active")) {
      return res.status(409).json({ ok: false, error: "seq_in_use" });
    }
    return res.status(500).json({ ok: false, error: "database_error" });
  }
});

// -----------------------------------------------------------------------------
// Admin (escritura) — protegido con token (se mantienen)
// -----------------------------------------------------------------------------
app.get("/admin/ping", (req, res) => {
  if (!isAuthorized(req))
    return res.status(401).json({ ok: false, error: "unauthorized" });
  res.json({ ok: true, msg: "admin ok" });
});

// Upsert de envío (por ref_code) — se mantiene para uso interno
app.post("/admin/shipments/upsert", async (req, res) => {
  if (!isAuthorized(req))
    return res.status(401).json({ ok: false, error: "unauthorized" });
  const { ref_code, tracking_number, status } = req.body || {};
  if (!ref_code || !tracking_number || !status) {
    return res.status(400).json({ ok: false, error: "missing_fields" });
  }
  try {
    await query(
      `INSERT INTO shipments (ref_code, tracking_number, status)
       VALUES ($1,$2,$3)
       ON CONFLICT (ref_code)
       DO UPDATE SET tracking_number = EXCLUDED.tracking_number,
                     status = EXCLUDED.status`,
      [ref_code, tracking_number, normalizeStatus(status)]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("Error upsert shipment:", err);
    res.status(500).json({ ok: false, error: "database_error" });
  }
});

// Agregar ubicación por lat/lon
app.post("/admin/locations/add", async (req, res) => {
  if (!isAuthorized(req))
    return res.status(401).json({ ok: false, error: "unauthorized" });
  const { shipment_ref, lat, lon } = req.body || {};
  if (!shipment_ref || typeof lat !== "number" || typeof lon !== "number") {
    return res.status(400).json({ ok: false, error: "missing_fields" });
  }
  try {
    await query(
      `INSERT INTO locations (shipment_ref, lat, lon) VALUES ($1,$2,$3)`,
      [shipment_ref, lat, lon]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("Error add location:", err);
    res.status(500).json({ ok: false, error: "database_error" });
  }
});

// Agregar ubicación por dirección (geocode)
app.post("/admin/locations/add-by-address", async (req, res) => {
  if (!isAuthorized(req))
    return res.status(401).json({ ok: false, error: "unauthorized" });
  const { shipment_ref, address } = req.body || {};
  if (!shipment_ref || !address) {
    return res.status(400).json({ ok: false, error: "missing_fields" });
  }
  try {
    const { lat, lon } = await geocode(address);
    await query(
      `INSERT INTO locations (shipment_ref, lat, lon) VALUES ($1,$2,$3)`,
      [shipment_ref, lat, lon]
    );
    res.json({ ok: true, lat, lon });
  } catch (err: any) {
    console.error("Error add-by-address:", err);
    res
      .status(500)
      .json({ ok: false, error: err.message || "geocode_failed" });
  }
});

export default app;
