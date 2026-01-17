-- Migration: create_issue_histories_table.sql
-- Creates a table to store issue timeline / history entries.
-- Run with psql -d <db> -f create_issue_histories_table.sql

BEGIN;

-- Table: issue_histories
CREATE TABLE IF NOT EXISTS issue_histories (
  id SERIAL PRIMARY KEY,
  issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  actor_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_issue_histories_issue_id ON issue_histories (issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_histories_actor_id ON issue_histories (actor_id);
CREATE INDEX IF NOT EXISTS idx_issue_histories_created_at ON issue_histories (created_at);

-- Convenience view with singular name for compatibility if any code expects `issue_history`.
CREATE OR REPLACE VIEW issue_history AS SELECT * FROM issue_histories;

COMMIT;

-- Notes:
-- - `details` is stored as JSONB so services can save structured payloads (before/after snapshots, diffs, metadata).
-- - Consider pruning old history rows or partitioning if you expect very high write volumes.
