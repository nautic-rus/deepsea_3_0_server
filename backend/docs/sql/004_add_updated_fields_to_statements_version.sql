-- Migration: add updated_by and updated_at to statements_version
-- Run with:
--   psql -d <db> -f 004_add_updated_fields_to_statements_version.sql

ALTER TABLE public.statements_version
  ADD COLUMN IF NOT EXISTS updated_by INTEGER,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;
