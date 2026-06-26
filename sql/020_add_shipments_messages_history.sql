-- Migration: 020_add_shipments_messages_history.sql
-- Adds shipment messages/history tables and related permissions.

BEGIN;

-- Shipment messages
CREATE TABLE IF NOT EXISTS shipment_messages (
  id SERIAL PRIMARY KEY,
  shipment_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  parent_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipment_messages_shipment_id ON shipment_messages(shipment_id);

-- Shipment history
CREATE TABLE IF NOT EXISTS shipment_history (
  id SERIAL PRIMARY KEY,
  shipment_id INTEGER NOT NULL,
  changed_by INTEGER,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipment_history_shipment_id ON shipment_history(shipment_id);

-- Permissions
INSERT INTO permissions (name, code, description) VALUES ('shipments.messages', 'shipments.messages', 'View and add shipment messages') ON CONFLICT (code) DO NOTHING;
INSERT INTO permissions (name, code, description) VALUES ('shipments.history', 'shipments.history', 'View shipment history') ON CONFLICT (code) DO NOTHING;

COMMIT;

