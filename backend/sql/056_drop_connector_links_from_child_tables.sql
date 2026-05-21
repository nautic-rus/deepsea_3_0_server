-- Repair migration: drop specifications_data_connector_id from child connector tables.
--
-- Final layout:
-- - specifications_data_connector holds references to exactly one source/project connector row.
-- - specifications_source_connector contains its own fields only.
-- - specifications_project_connector contains its own fields only.

BEGIN;

-- Ensure back-reference columns on the parent table are populated before dropping child links.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'specifications_data_connector'
      AND column_name = 'specifications_source_connector_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'specifications_source_connector'
      AND column_name = 'specifications_data_connector_id'
  ) THEN
    UPDATE public.specifications_data_connector d
    SET specifications_source_connector_id = s.id
    FROM public.specifications_source_connector s
    WHERE s.specifications_data_connector_id = d.id
      AND d.specifications_source_connector_id IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'specifications_data_connector'
      AND column_name = 'specifications_project_connector_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'specifications_project_connector'
      AND column_name = 'specifications_data_connector_id'
  ) THEN
    UPDATE public.specifications_data_connector d
    SET specifications_project_connector_id = p.id
    FROM public.specifications_project_connector p
    WHERE p.specifications_data_connector_id = d.id
      AND d.specifications_project_connector_id IS NULL;
  END IF;
END
$$;

-- Drop constraints/indexes that belonged to the old child-to-parent relationship.
ALTER TABLE IF EXISTS public.specifications_source_connector
  DROP CONSTRAINT IF EXISTS specifications_source_connector_data_connector_id_key;
ALTER TABLE IF EXISTS public.specifications_project_connector
  DROP CONSTRAINT IF EXISTS specifications_project_connector_data_connector_id_key;

DROP INDEX IF EXISTS public.idx_specifications_source_connector_data_connector_id;
DROP INDEX IF EXISTS public.idx_specifications_project_connector_data_connector_id;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'specifications_source_connector_data_connector_id_fkey'
      AND conrelid = 'public.specifications_source_connector'::regclass
  ) THEN
    ALTER TABLE public.specifications_source_connector
      DROP CONSTRAINT specifications_source_connector_data_connector_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'specifications_project_connector_data_connector_id_fkey'
      AND conrelid = 'public.specifications_project_connector'::regclass
  ) THEN
    ALTER TABLE public.specifications_project_connector
      DROP CONSTRAINT specifications_project_connector_data_connector_id_fkey;
  END IF;
END
$$;

-- Drop the obsolete link columns from the child tables.
ALTER TABLE IF EXISTS public.specifications_source_connector
  DROP COLUMN IF EXISTS specifications_data_connector_id;

ALTER TABLE IF EXISTS public.specifications_project_connector
  DROP COLUMN IF EXISTS specifications_data_connector_id;

COMMIT;
