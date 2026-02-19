-- Add type_id, rev, user_id, archive, archive_data to documents_storage
-- Create documents_storage_type table and relations

-- Create documents_storage_type
CREATE TABLE IF NOT EXISTS documents_storage_type (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(100) UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add columns to documents_storage
ALTER TABLE documents_storage
  ADD COLUMN IF NOT EXISTS type_id INTEGER REFERENCES documents_storage_type(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rev INTEGER,
  ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archive BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS archive_data TIMESTAMP;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_documents_storage_type_id ON documents_storage(type_id);
CREATE INDEX IF NOT EXISTS idx_documents_storage_user_id ON documents_storage(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_storage_archive ON documents_storage(archive);

-- Optional: ensure (document_id, storage_id) unique constraint exists (should be already present in base schema)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'documents_storage_document_id_storage_id_key'
  ) THEN
    ALTER TABLE documents_storage ADD CONSTRAINT documents_storage_document_id_storage_id_key UNIQUE (document_id, storage_id);
  END IF;
END$$;
