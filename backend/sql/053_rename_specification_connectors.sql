-- Repair migration: rename specification connector tables and enforce one-to-one links.
--
-- Final names:
-- - specifications_data_connector
-- - specifications_source_connector
-- - specifications_project_connector
--
-- Rules:
-- - Each specifications_data_connector row can have at most one source connector row.
-- - Each specifications_data_connector row can have at most one project connector row.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.specifications_resource_connector') IS NOT NULL
     AND to_regclass('public.specifications_source_connector') IS NULL THEN
    ALTER TABLE public.specifications_resource_connector RENAME TO specifications_source_connector;
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.specifications_sourse_project') IS NOT NULL
     AND to_regclass('public.specifications_project_connector') IS NULL THEN
    ALTER TABLE public.specifications_sourse_project RENAME TO specifications_project_connector;
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.specifications_resource_connector_id_seq') IS NOT NULL
     AND to_regclass('public.specifications_source_connector_id_seq') IS NULL THEN
    ALTER SEQUENCE public.specifications_resource_connector_id_seq RENAME TO specifications_source_connector_id_seq;
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.specifications_sourse_project_id_seq') IS NOT NULL
     AND to_regclass('public.specifications_project_connector_id_seq') IS NULL THEN
    ALTER SEQUENCE public.specifications_sourse_project_id_seq RENAME TO specifications_project_connector_id_seq;
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.specifications_source_connector') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint
        WHERE conname = 'specifications_source_connector_data_connector_id_key'
          AND conrelid = 'public.specifications_source_connector'::regclass
     ) THEN
    ALTER TABLE public.specifications_source_connector
      ADD CONSTRAINT specifications_source_connector_data_connector_id_key UNIQUE (specifications_data_connector_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.specifications_project_connector') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint
        WHERE conname = 'specifications_project_connector_data_connector_id_key'
          AND conrelid = 'public.specifications_project_connector'::regclass
     ) THEN
    ALTER TABLE public.specifications_project_connector
      ADD CONSTRAINT specifications_project_connector_data_connector_id_key UNIQUE (specifications_data_connector_id);
  END IF;
END
$$;

DO $$
DECLARE
  old_name text;
BEGIN
  IF to_regclass('public.specifications_source_connector') IS NOT NULL THEN
    SELECT conname INTO old_name
    FROM pg_constraint
    WHERE conrelid = 'public.specifications_source_connector'::regclass
      AND conname = 'specifications_resource_connector_data_connector_id_fkey'
    LIMIT 1;
    IF old_name IS NOT NULL THEN
      EXECUTE 'ALTER TABLE public.specifications_source_connector RENAME CONSTRAINT specifications_resource_connector_data_connector_id_fkey TO specifications_source_connector_data_connector_id_fkey';
    END IF;
  END IF;
END
$$;

DO $$
DECLARE
  old_name text;
BEGIN
  IF to_regclass('public.specifications_project_connector') IS NOT NULL THEN
    SELECT conname INTO old_name
    FROM pg_constraint
    WHERE conrelid = 'public.specifications_project_connector'::regclass
      AND conname = 'specifications_sourse_project_data_connector_id_fkey'
    LIMIT 1;
    IF old_name IS NOT NULL THEN
      EXECUTE 'ALTER TABLE public.specifications_project_connector RENAME CONSTRAINT specifications_sourse_project_data_connector_id_fkey TO specifications_project_connector_data_connector_id_fkey';
    END IF;
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.idx_specifications_resource_connector_data_connector_id') IS NOT NULL
     AND to_regclass('public.idx_specifications_source_connector_data_connector_id') IS NULL THEN
    ALTER INDEX public.idx_specifications_resource_connector_data_connector_id
      RENAME TO idx_specifications_source_connector_data_connector_id;
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.idx_specifications_sourse_project_data_connector_id') IS NOT NULL
     AND to_regclass('public.idx_specifications_project_connector_data_connector_id') IS NULL THEN
    ALTER INDEX public.idx_specifications_sourse_project_data_connector_id
      RENAME TO idx_specifications_project_connector_data_connector_id;
  END IF;
END
$$;

COMMIT;
