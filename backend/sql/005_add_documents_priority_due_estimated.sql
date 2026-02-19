-- Add priority, due_date, estimated_hours to documents table
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS priority VARCHAR(50),
  ADD COLUMN IF NOT EXISTS due_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS estimated_hours INTEGER;

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_documents_priority ON documents(priority);
CREATE INDEX IF NOT EXISTS idx_documents_due_date ON documents(due_date);
CREATE INDEX IF NOT EXISTS idx_documents_estimated_hours ON documents(estimated_hours);
