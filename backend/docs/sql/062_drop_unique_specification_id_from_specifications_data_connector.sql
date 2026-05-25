-- Allow multiple connector rows per specification.
-- Run with psql against the target database.

BEGIN;

ALTER TABLE IF EXISTS public.specifications_data_connector
  DROP CONSTRAINT IF EXISTS specifications_data_connector_specification_id_key;

COMMIT;
