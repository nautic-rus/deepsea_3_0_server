-- Migration: add specialization_id to specification for linking to specializations.

BEGIN;

ALTER TABLE IF EXISTS public.specification
  ADD COLUMN IF NOT EXISTS specialization_id INTEGER;

ALTER TABLE IF EXISTS public.specification
  DROP CONSTRAINT IF EXISTS specification_specialization_id_fkey;

ALTER TABLE IF EXISTS public.specification
  ADD CONSTRAINT specification_specialization_id_fkey
  FOREIGN KEY (specialization_id)
  REFERENCES public.specializations(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_specification_specialization_id
  ON public.specification (specialization_id);

COMMIT;
