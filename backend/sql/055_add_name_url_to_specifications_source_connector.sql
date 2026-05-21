-- Repair migration: add name and url to specifications_source_connector.

BEGIN;

ALTER TABLE IF EXISTS public.specifications_source_connector
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS url TEXT;

COMMIT;
