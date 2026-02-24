-- 006_add_document_messages_parent_id.sql
-- Add parent_id to document_messages to support threaded/reply messages

ALTER TABLE document_messages
  ADD COLUMN parent_id INTEGER REFERENCES document_messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_document_messages_parent_id ON document_messages(parent_id);
