-- Add is_active column to customer_questions for soft-delete support
ALTER TABLE customer_questions ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
-- Ensure existing rows are marked active
UPDATE customer_questions SET is_active = true WHERE is_active IS NULL;
-- Optional index to speed up queries filtering by is_active
CREATE INDEX IF NOT EXISTS idx_customer_questions_is_active ON customer_questions(is_active);
