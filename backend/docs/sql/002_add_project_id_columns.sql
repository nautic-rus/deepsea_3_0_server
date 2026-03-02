-- Migration: add project_id to status/type/work_flow/storage_type tables
-- Adds nullable project_id FK, updates workflow unique constraints to include project_id,
-- and creates indexes for project_id.

BEGIN;

-- Add project_id columns (nullable)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='document_status' AND column_name='project_id') THEN
    EXECUTE 'ALTER TABLE document_status ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='document_type' AND column_name='project_id') THEN
    EXECUTE 'ALTER TABLE document_type ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='document_work_flow' AND column_name='project_id') THEN
    EXECUTE 'ALTER TABLE document_work_flow ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='documents_storage_type' AND column_name='project_id') THEN
    EXECUTE 'ALTER TABLE documents_storage_type ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='issue_status' AND column_name='project_id') THEN
    EXECUTE 'ALTER TABLE issue_status ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='issue_type' AND column_name='project_id') THEN
    EXECUTE 'ALTER TABLE issue_type ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='issue_work_flow' AND column_name='project_id') THEN
    EXECUTE 'ALTER TABLE issue_work_flow ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE';
  END IF;
END $$;

-- Drop existing unique constraints on workflows that don't include project_id (detect by definition)
DO $$
DECLARE
  c TEXT;
BEGIN
  SELECT conname INTO c
    FROM pg_constraint
   WHERE conrelid = 'document_work_flow'::regclass
     AND contype = 'u'
     AND pg_get_constraintdef(oid) LIKE '%from_status_id%'
     AND pg_get_constraintdef(oid) LIKE '%to_status_id%'
   LIMIT 1;
  IF c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE document_work_flow DROP CONSTRAINT %I', c);
  END IF;

  SELECT conname INTO c
    FROM pg_constraint
   WHERE conrelid = 'issue_work_flow'::regclass
     AND contype = 'u'
     AND pg_get_constraintdef(oid) LIKE '%issue_type_id%'
     AND pg_get_constraintdef(oid) LIKE '%from_status_id%'
     AND pg_get_constraintdef(oid) LIKE '%to_status_id%'
   LIMIT 1;
  IF c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE issue_work_flow DROP CONSTRAINT %I', c);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'document_work_flow_project_from_to_key') THEN
    EXECUTE 'ALTER TABLE document_work_flow ADD CONSTRAINT document_work_flow_project_from_to_key UNIQUE (project_id, from_status_id, to_status_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'issue_work_flow_project_type_from_to_key') THEN
    EXECUTE 'ALTER TABLE issue_work_flow ADD CONSTRAINT issue_work_flow_project_type_from_to_key UNIQUE (project_id, issue_type_id, from_status_id, to_status_id)';
  END IF;
END $$;

-- Create indexes on project_id for faster filtering
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relkind = 'i' AND relname = 'idx_document_status_project_id') THEN
    EXECUTE 'CREATE INDEX idx_document_status_project_id ON document_status(project_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relkind = 'i' AND relname = 'idx_document_type_project_id') THEN
    EXECUTE 'CREATE INDEX idx_document_type_project_id ON document_type(project_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relkind = 'i' AND relname = 'idx_document_work_flow_project_id') THEN
    EXECUTE 'CREATE INDEX idx_document_work_flow_project_id ON document_work_flow(project_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relkind = 'i' AND relname = 'idx_documents_storage_type_project_id') THEN
    EXECUTE 'CREATE INDEX idx_documents_storage_type_project_id ON documents_storage_type(project_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relkind = 'i' AND relname = 'idx_issue_status_project_id') THEN
    EXECUTE 'CREATE INDEX idx_issue_status_project_id ON issue_status(project_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relkind = 'i' AND relname = 'idx_issue_type_project_id') THEN
    EXECUTE 'CREATE INDEX idx_issue_type_project_id ON issue_type(project_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relkind = 'i' AND relname = 'idx_issue_work_flow_project_id') THEN
    EXECUTE 'CREATE INDEX idx_issue_work_flow_project_id ON issue_work_flow(project_id)';
  END IF;
END $$;

COMMIT;
