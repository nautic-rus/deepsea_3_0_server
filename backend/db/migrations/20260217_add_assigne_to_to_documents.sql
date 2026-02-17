-- Migration: add assigne_to column to documents
-- Generated: 2026-02-17

BEGIN;

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS assigne_to integer REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_assigne_to ON documents(assigne_to);

COMMIT;

-- Rollback:
-- ALTER TABLE documents DROP COLUMN IF EXISTS assigne_to;
-- DROP INDEX IF EXISTS idx_documents_assigne_to;
