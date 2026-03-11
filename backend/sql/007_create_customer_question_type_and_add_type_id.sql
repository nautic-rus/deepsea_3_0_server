-- Migration: create customer_question_type table and add type_id to customer_questions
BEGIN;

CREATE TABLE IF NOT EXISTS customer_question_type (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(255),
  description TEXT,
  color VARCHAR(32),
  order_index INTEGER DEFAULT 0,
  project_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE customer_questions
  ADD COLUMN IF NOT EXISTS type_id INTEGER;

-- add foreign key if the referenced table exists
ALTER TABLE customer_questions
  ADD CONSTRAINT IF NOT EXISTS fk_customer_questions_type
  FOREIGN KEY (type_id) REFERENCES customer_question_type(id) ON DELETE SET NULL;

COMMIT;
