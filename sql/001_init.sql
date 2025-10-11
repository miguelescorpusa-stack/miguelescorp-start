-- tabla de envíos
CREATE TABLE IF NOT EXISTS shipments (
  id BIGSERIAL PRIMARY KEY,
  ref_code TEXT UNIQUE NOT NULL,
  pickup_address JSONB NOT NULL,
  delivery_address JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'created',
  eta TEXT,
  assigned_driver TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ubicaciones por envío (histórico)
CREATE TABLE IF NOT EXISTS locations (
  id BIGSERIAL PRIMARY KEY,
  shipment_ref TEXT NOT NULL REFERENCES shipments(ref_code) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_locations_ref_ts ON locations (shipment_ref, ts DESC);
