-- Secuencia para ref_code: MC-00201 en adelante
CREATE SEQUENCE IF NOT EXISTS shipment_seq START WITH 201;

-- Generador MC-00xxx
CREATE OR REPLACE FUNCTION mc_next_ref() RETURNS TEXT AS $$
  SELECT 'MC-' || TO_CHAR(NEXTVAL('shipment_seq'), 'FM00000');
$$ LANGUAGE SQL;
