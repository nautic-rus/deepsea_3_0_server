-- Migration: 016_add_sfi_code_to_documents.sql
-- Add sfi_code_id column to documents and foreign key to sfi_codes(id)

BEGIN;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS sfi_code_id integer NULL;

-- Add FK if sfi_codes table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sfi_codes') THEN
    BEGIN
      ALTER TABLE public.documents
        ADD CONSTRAINT fk_documents_sfi_code
        FOREIGN KEY (sfi_code_id) REFERENCES public.sfi_codes(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN
      -- constraint already exists, ignore
      NULL;
    END;
  ELSE
    RAISE NOTICE 'Table sfi_codes does not exist; please create it before applying FK';
  END IF;
END$$;

COMMIT;
