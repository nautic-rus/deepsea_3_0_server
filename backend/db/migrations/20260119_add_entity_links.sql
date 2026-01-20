-- Migration: add flexible entity links table and helpers
-- Creates a generic table `entity_links` to represent relations between issues/documents (and other future entities).
-- Also provides convenient views and functions to check whether an issue/document has blocking links that would prevent closing.

BEGIN;

CREATE TABLE IF NOT EXISTS entity_links (
    id SERIAL PRIMARY KEY,
    source_type VARCHAR(32) NOT NULL, -- e.g. 'issue', 'document'
    source_id INTEGER NOT NULL,
    target_type VARCHAR(32) NOT NULL, -- e.g. 'issue', 'document'
    target_id INTEGER NOT NULL,
    relation_type VARCHAR(50) NOT NULL DEFAULT 'relates', -- e.g. 'blocks', 'relates', 'duplicates'
    blocks_closure BOOLEAN NOT NULL DEFAULT FALSE, -- when true, this link blocks closing the source until target is resolved
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (source_type, source_id, target_type, target_id, relation_type)
);

-- Indexes for quick lookups
CREATE INDEX IF NOT EXISTS idx_entity_links_source ON entity_links(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_entity_links_target ON entity_links(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_entity_links_blocks ON entity_links(blocks_closure);

-- View: count of blocking links for issues (source is issue, target is issue and target is not final)
CREATE OR REPLACE VIEW vw_issue_blocking_links AS
SELECT el.source_id AS issue_id, COUNT(*)::int AS blocking_count
FROM entity_links el
JOIN issues tgt ON el.target_type = 'issue' AND tgt.id = el.target_id
JOIN issue_status s ON tgt.status_id = s.id
WHERE el.source_type = 'issue' AND el.blocks_closure = TRUE AND (s.is_final = FALSE OR s.is_final IS NULL)
GROUP BY el.source_id;

-- View: count of blocking links for documents (source is document, target is document and target is not final)
CREATE OR REPLACE VIEW vw_document_blocking_links AS
SELECT el.source_id AS document_id, COUNT(*)::int AS blocking_count
FROM entity_links el
JOIN documents tgt ON el.target_type = 'document' AND tgt.id = el.target_id
JOIN document_status s ON tgt.status_id = s.id
WHERE el.source_type = 'document' AND el.blocks_closure = TRUE AND (s.is_final = FALSE OR s.is_final IS NULL)
GROUP BY el.source_id;

-- Function: returns true if the given issue can be closed (no blocking links)
CREATE OR REPLACE FUNCTION can_close_issue(i_id INTEGER) RETURNS BOOLEAN AS $$
DECLARE
  cnt INTEGER := 0;
BEGIN
  SELECT COALESCE(SUM(blocking_count),0) INTO cnt FROM vw_issue_blocking_links WHERE issue_id = i_id;
  RETURN cnt = 0;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: returns true if the given document can be closed (no blocking links)
CREATE OR REPLACE FUNCTION can_close_document(d_id INTEGER) RETURNS BOOLEAN AS $$
DECLARE
  cnt INTEGER := 0;
BEGIN
  SELECT COALESCE(SUM(blocking_count),0) INTO cnt FROM vw_document_blocking_links WHERE document_id = d_id;
  RETURN cnt = 0;
END;
$$ LANGUAGE plpgsql STABLE;

COMMIT;

-- Notes for developers:
-- - This is intentionally generic to allow future entity relationships.
-- - Application-level logic should call can_close_issue(issue_id) / can_close_document(document_id)
--   before allowing a transition to a final status. Alternatively, check the vw_* views directly.
