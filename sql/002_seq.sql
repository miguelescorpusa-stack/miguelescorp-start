-- Secuencia para ref_code: MC-00201, etc.
CREATE SEQUENCE IF NOT EXISTS shipment_seq START WITH 201;

-- Helper para crear código con ceros a la izquierda
CREATE OR REPLACE FUNCTION mc_next_ref() RETURNS TEXT AS $$
  SELECT 'MC-' || TO_CHAR(NEXTVAL('shipment_seq'), 'FM00000');
$$ LANGUAGE SQL;
