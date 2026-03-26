-- Migration: 015_add_is_protected_columns.sql
-- Add `is_protected` boolean column (default false) to a set of tables
-- and prevent deleting rows where is_protected = true.

BEGIN;

-- Create helper function that will be used by triggers
CREATE OR REPLACE FUNCTION public.prevent_delete_if_protected()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.is_protected IS TRUE THEN
    RAISE EXCEPTION 'Cannot delete protected row from %', TG_TABLE_NAME;
  END IF;
  RETURN OLD;
END;
$$;

-- List of tables to modify
-- If any table does not exist in the current DB, the ALTER TABLE will fail.
-- Adjust as needed if you use a different schema or table names.

-- Add column if missing and attach trigger which prevents deletion when is_protected = true
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'categories',
    'customer_question_status',
    'customer_question_type',
    'document_status',
    'document_type',
    'issue_status',
    'issue_type',
    'notification_events',
    'notification_methods',
    'pages',
    'permissions',
    'roles',
    'specializations',
    'units'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    -- add column if not exists
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS is_protected boolean NOT NULL DEFAULT false', tbl);
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Skipping ALTER TABLE for %: %', tbl, SQLERRM;
    END;

    -- drop existing trigger if any, then create trigger
    BEGIN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_prevent_delete_if_protected ON public.%I', tbl);
      EXECUTE format(
        'CREATE TRIGGER trg_prevent_delete_if_protected BEFORE DELETE ON public.%I FOR EACH ROW WHEN (OLD.is_protected IS TRUE) EXECUTE FUNCTION public.prevent_delete_if_protected()',
        tbl
      );
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Skipping trigger creation for %: %', tbl, SQLERRM;
    END;
  END LOOP;
END$$;

COMMIT;

-- End migration
