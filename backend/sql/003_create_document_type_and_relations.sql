-- Create document_type table and add relations to documents and document_work_flow

-- Table for document types
CREATE TABLE IF NOT EXISTS document_type (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(20),
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add type_id to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS type_id INTEGER REFERENCES document_type(id) ON DELETE SET NULL;

-- Add document_type_id to document_work_flow to allow per-type workflows
ALTER TABLE document_work_flow ADD COLUMN IF NOT EXISTS document_type_id INTEGER REFERENCES document_type(id) ON DELETE CASCADE;

-- Add unique constraint for workflow per (document_type_id, from_status_id, to_status_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'document_work_flow_document_type_id_from_status_id_to_status_id_key'
  ) THEN
    ALTER TABLE document_work_flow ADD CONSTRAINT document_work_flow_document_type_id_from_status_id_to_status_id_key UNIQUE (document_type_id, from_status_id, to_status_id);
  END IF;
END$$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_document_type_code ON document_type(code);
CREATE INDEX IF NOT EXISTS idx_documents_type_id ON documents(type_id);
CREATE INDEX IF NOT EXISTS idx_document_work_flow_type ON document_work_flow(document_type_id);
