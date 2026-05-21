-- Migration: add updated_by and updated_at to specification_version
-- Run with:
--   psql -d <db> -f 003_add_updated_fields_to_specification_version.sql

ALTER TABLE public.specification_version
  ADD COLUMN IF NOT EXISTS updated_by INTEGER,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;
