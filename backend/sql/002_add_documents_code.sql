-- Add `code` column to documents table to store document number
ALTER TABLE documents ADD COLUMN IF NOT EXISTS code VARCHAR(255);
-- Optionally: create an index for faster lookups by code
CREATE INDEX IF NOT EXISTS idx_documents_code ON documents(code);
