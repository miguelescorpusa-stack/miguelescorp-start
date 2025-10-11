CREATE TABLE IF NOT EXISTS shipments (
  id SERIAL PRIMARY KEY,
  ref_code TEXT UNIQUE NOT NULL,
  pickup_address TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  assigned_driver TEXT,
  status TEXT DEFAULT 'created',
  created_at TIMESTAMP DEFAULT NOW()
);
