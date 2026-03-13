-- Migration: create_customer_question_histories_table.sql
-- Creates a table to store customer question timeline / history entries.
-- Run with psql -d <db> -f create_customer_question_histories_table.sql

BEGIN;

-- Table: customer_question_histories
CREATE TABLE IF NOT EXISTS customer_question_histories (
  id SERIAL PRIMARY KEY,
  question_id INTEGER NOT NULL REFERENCES customer_questions(id) ON DELETE CASCADE,
  changed_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  field_name TEXT NOT NULL,
  old_value TEXT NULL,
  new_value TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_question_histories_question_id ON customer_question_histories (question_id);
CREATE INDEX IF NOT EXISTS idx_customer_question_histories_changed_by ON customer_question_histories (changed_by);
CREATE INDEX IF NOT EXISTS idx_customer_question_histories_created_at ON customer_question_histories (created_at);

-- Convenience view with singular name for compatibility
CREATE OR REPLACE VIEW customer_question_history AS SELECT * FROM customer_question_histories;

COMMIT;
