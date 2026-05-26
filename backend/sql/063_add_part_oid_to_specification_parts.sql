-- Migration: add part_oid to specification_parts for storing FORAN PART_OID.

BEGIN;

ALTER TABLE IF EXISTS public.specification_parts
  ADD COLUMN IF NOT EXISTS part_oid BIGINT;

COMMIT;
