-- Migration: add customer_question_type_id to customer_question_work_flow
BEGIN;

ALTER TABLE customer_question_work_flow
  ADD COLUMN IF NOT EXISTS customer_question_type_id INTEGER;

-- Drop old unique constraint on from/to and replace with type + from + to
ALTER TABLE customer_question_work_flow
  DROP CONSTRAINT IF EXISTS customer_question_work_flow_from_status_id_to_status_id_key;

ALTER TABLE customer_question_work_flow
  ADD CONSTRAINT customer_question_work_flow_type_from_to_key UNIQUE (customer_question_type_id, from_status_id, to_status_id);

ALTER TABLE customer_question_work_flow
  ADD CONSTRAINT IF NOT EXISTS fk_customer_question_work_flow_type
  FOREIGN KEY (customer_question_type_id) REFERENCES customer_question_type(id) ON DELETE SET NULL;

COMMIT;
