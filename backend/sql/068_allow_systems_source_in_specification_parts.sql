-- Migration: allow systems source value in specification_parts.source.

ALTER TABLE IF EXISTS public.specification_parts
  DROP CONSTRAINT IF EXISTS specification_parts_source_check;

ALTER TABLE IF EXISTS public.specification_parts
  ADD CONSTRAINT specification_parts_source_check
  CHECK (source::text = ANY (ARRAY['import'::character varying, 'manual'::character varying, 'foran'::character varying, 'astructure'::character varying, 'systems'::character varying]::text[]));
