-- Repair migration: add back-references from specifications_data_connector
-- to the single source and project connector rows.
--
-- Rules:
-- - specifications_data_connector.specifications_source_connector_id points to exactly one source connector row.
-- - specifications_data_connector.specifications_project_connector_id points to exactly one project connector row.
-- - Child tables already enforce one row per data connector via UNIQUE(specifications_data_connector_id).

BEGIN;

ALTER TABLE IF EXISTS public.specifications_data_connector
  ADD COLUMN IF NOT EXISTS specifications_source_connector_id INTEGER,
  ADD COLUMN IF NOT EXISTS specifications_project_connector_id INTEGER;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'specifications_data_connector'
      AND column_name = 'specifications_source_connector_id'
  ) THEN
    UPDATE public.specifications_data_connector d
    SET specifications_source_connector_id = s.id
    FROM public.specifications_source_connector s
    WHERE s.specifications_data_connector_id = d.id
      AND d.specifications_source_connector_id IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'specifications_data_connector'
      AND column_name = 'specifications_project_connector_id'
  ) THEN
    UPDATE public.specifications_data_connector d
    SET specifications_project_connector_id = p.id
    FROM public.specifications_project_connector p
    WHERE p.specifications_data_connector_id = d.id
      AND d.specifications_project_connector_id IS NULL;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.specifications_data_connector'::regclass
      AND conname = 'specifications_data_connector_source_connector_id_key'
  ) THEN
    ALTER TABLE public.specifications_data_connector
      ADD CONSTRAINT specifications_data_connector_source_connector_id_key UNIQUE (specifications_source_connector_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.specifications_data_connector'::regclass
      AND conname = 'specifications_data_connector_project_connector_id_key'
  ) THEN
    ALTER TABLE public.specifications_data_connector
      ADD CONSTRAINT specifications_data_connector_project_connector_id_key UNIQUE (specifications_project_connector_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.specifications_data_connector'::regclass
      AND conname = 'specifications_data_connector_source_connector_id_fkey'
  ) THEN
    ALTER TABLE public.specifications_data_connector
      ADD CONSTRAINT specifications_data_connector_source_connector_id_fkey
      FOREIGN KEY (specifications_source_connector_id)
      REFERENCES public.specifications_source_connector(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.specifications_data_connector'::regclass
      AND conname = 'specifications_data_connector_project_connector_id_fkey'
  ) THEN
    ALTER TABLE public.specifications_data_connector
      ADD CONSTRAINT specifications_data_connector_project_connector_id_fkey
      FOREIGN KEY (specifications_project_connector_id)
      REFERENCES public.specifications_project_connector(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

COMMIT;
