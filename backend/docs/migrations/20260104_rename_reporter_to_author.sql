-- Migration: rename issues.reporter_id -> issues.author_id
-- NOTE: Run this in a maintenance window. Test on staging before production.
BEGIN;

-- Rename column
ALTER TABLE issues RENAME COLUMN reporter_id TO author_id;

-- Rename FK constraint if Postgres created one with default name; if there is a named constraint, adjust accordingly.
-- Example to find FK constraint name:
-- SELECT conname FROM pg_constraint WHERE conrelid = 'issues'::regclass AND contype='f';

-- Recreate index: drop old index if exists and create new one
DROP INDEX IF EXISTS idx_issue_reporter_id;
CREATE INDEX IF NOT EXISTS idx_issue_author_id ON issues(author_id);

COMMIT;
