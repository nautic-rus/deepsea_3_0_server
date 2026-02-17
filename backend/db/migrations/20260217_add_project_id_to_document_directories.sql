-- Migration: add project_id to document_directories
-- Run this SQL on your database to add the column and index.
BEGIN;

ALTER TABLE IF EXISTS document_directories
  ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_document_directories_project_id ON document_directories(project_id);

COMMIT;

-- Down migration (manual rollback):
-- ALTER TABLE document_directories DROP CONSTRAINT IF EXISTS document_directories_project_id_fkey;
-- DROP INDEX IF EXISTS idx_document_directories_project_id;
-- ALTER TABLE document_directories DROP COLUMN IF EXISTS project_id;
