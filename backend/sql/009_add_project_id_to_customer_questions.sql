-- Migration: add project_id to customer_questions
BEGIN;

ALTER TABLE customer_questions
  ADD COLUMN IF NOT EXISTS project_id INTEGER;

ALTER TABLE customer_questions
  ADD CONSTRAINT IF NOT EXISTS fk_customer_questions_project
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_customer_questions_project_id ON customer_questions(project_id);

COMMIT;
