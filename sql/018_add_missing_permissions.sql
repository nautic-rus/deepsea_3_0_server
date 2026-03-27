-- Migration: 018_add_missing_permissions.sql
-- Add permissions that are used in the application code but were missing from the DB.
-- Safe to re-run: uses ON CONFLICT DO NOTHING.

BEGIN;

-- Groups
INSERT INTO permissions (name, code, description) VALUES ('groups.create', 'groups.create', 'Create groups') ON CONFLICT (code) DO NOTHING;
INSERT INTO permissions (name, code, description) VALUES ('groups.delete', 'groups.delete', 'Delete groups') ON CONFLICT (code) DO NOTHING;
INSERT INTO permissions (name, code, description) VALUES ('groups.update', 'groups.update', 'Update groups') ON CONFLICT (code) DO NOTHING;
INSERT INTO permissions (name, code, description) VALUES ('groups.view', 'groups.view', 'View groups') ON CONFLICT (code) DO NOTHING;

-- Organizations
INSERT INTO permissions (name, code, description) VALUES ('organizations.create', 'organizations.create', 'Create organizations') ON CONFLICT (code) DO NOTHING;
INSERT INTO permissions (name, code, description) VALUES ('organizations.delete', 'organizations.delete', 'Delete organizations') ON CONFLICT (code) DO NOTHING;
INSERT INTO permissions (name, code, description) VALUES ('organizations.update', 'organizations.update', 'Update organizations') ON CONFLICT (code) DO NOTHING;
INSERT INTO permissions (name, code, description) VALUES ('organizations.view', 'organizations.view', 'View organizations') ON CONFLICT (code) DO NOTHING;

-- Shipments
INSERT INTO permissions (name, code, description) VALUES ('shipments.create', 'shipments.create', 'Create shipments') ON CONFLICT (code) DO NOTHING;
INSERT INTO permissions (name, code, description) VALUES ('shipments.delete', 'shipments.delete', 'Delete shipments') ON CONFLICT (code) DO NOTHING;
INSERT INTO permissions (name, code, description) VALUES ('shipments.update', 'shipments.update', 'Update shipments') ON CONFLICT (code) DO NOTHING;
INSERT INTO permissions (name, code, description) VALUES ('shipments.view', 'shipments.view', 'View shipments') ON CONFLICT (code) DO NOTHING;

-- Suppliers
INSERT INTO permissions (name, code, description) VALUES ('suppliers.create', 'suppliers.create', 'Create suppliers') ON CONFLICT (code) DO NOTHING;
INSERT INTO permissions (name, code, description) VALUES ('suppliers.delete', 'suppliers.delete', 'Delete suppliers') ON CONFLICT (code) DO NOTHING;
INSERT INTO permissions (name, code, description) VALUES ('suppliers.update', 'suppliers.update', 'Update suppliers') ON CONFLICT (code) DO NOTHING;
INSERT INTO permissions (name, code, description) VALUES ('suppliers.view', 'suppliers.view', 'View suppliers') ON CONFLICT (code) DO NOTHING;

-- Time Logs
INSERT INTO permissions (name, code, description) VALUES ('time_logs.create', 'time_logs.create', 'Create time logs') ON CONFLICT (code) DO NOTHING;
INSERT INTO permissions (name, code, description) VALUES ('time_logs.delete', 'time_logs.delete', 'Delete time logs') ON CONFLICT (code) DO NOTHING;
INSERT INTO permissions (name, code, description) VALUES ('time_logs.update', 'time_logs.update', 'Update time logs') ON CONFLICT (code) DO NOTHING;
INSERT INTO permissions (name, code, description) VALUES ('time_logs.view', 'time_logs.view', 'View time logs') ON CONFLICT (code) DO NOTHING;

-- Notification Events
INSERT INTO permissions (name, code, description) VALUES ('notification_events.create', 'notification_events.create', 'Create notification events') ON CONFLICT (code) DO NOTHING;
INSERT INTO permissions (name, code, description) VALUES ('notification_events.delete', 'notification_events.delete', 'Delete notification events') ON CONFLICT (code) DO NOTHING;
INSERT INTO permissions (name, code, description) VALUES ('notification_events.update', 'notification_events.update', 'Update notification events') ON CONFLICT (code) DO NOTHING;
INSERT INTO permissions (name, code, description) VALUES ('notification_events.view', 'notification_events.view', 'View notification events') ON CONFLICT (code) DO NOTHING;

-- Notification Methods
INSERT INTO permissions (name, code, description) VALUES ('notification_methods.create', 'notification_methods.create', 'Create notification methods') ON CONFLICT (code) DO NOTHING;
INSERT INTO permissions (name, code, description) VALUES ('notification_methods.delete', 'notification_methods.delete', 'Delete notification methods') ON CONFLICT (code) DO NOTHING;
INSERT INTO permissions (name, code, description) VALUES ('notification_methods.update', 'notification_methods.update', 'Update notification methods') ON CONFLICT (code) DO NOTHING;
INSERT INTO permissions (name, code, description) VALUES ('notification_methods.view', 'notification_methods.view', 'View notification methods') ON CONFLICT (code) DO NOTHING;

-- Wiki Articles
INSERT INTO permissions (name, code, description) VALUES ('wiki.articles.create', 'wiki.articles.create', 'Create wiki articles') ON CONFLICT (code) DO NOTHING;
INSERT INTO permissions (name, code, description) VALUES ('wiki.articles.delete', 'wiki.articles.delete', 'Delete wiki articles') ON CONFLICT (code) DO NOTHING;
INSERT INTO permissions (name, code, description) VALUES ('wiki.articles.update', 'wiki.articles.update', 'Update wiki articles') ON CONFLICT (code) DO NOTHING;
INSERT INTO permissions (name, code, description) VALUES ('wiki.articles.view', 'wiki.articles.view', 'View wiki articles') ON CONFLICT (code) DO NOTHING;

-- Wiki Sections
INSERT INTO permissions (name, code, description) VALUES ('wiki.sections.create', 'wiki.sections.create', 'Create wiki sections') ON CONFLICT (code) DO NOTHING;
INSERT INTO permissions (name, code, description) VALUES ('wiki.sections.delete', 'wiki.sections.delete', 'Delete wiki sections') ON CONFLICT (code) DO NOTHING;
INSERT INTO permissions (name, code, description) VALUES ('wiki.sections.update', 'wiki.sections.update', 'Update wiki sections') ON CONFLICT (code) DO NOTHING;
INSERT INTO permissions (name, code, description) VALUES ('wiki.sections.view', 'wiki.sections.view', 'View wiki sections') ON CONFLICT (code) DO NOTHING;

-- Wiki Storage
INSERT INTO permissions (name, code, description) VALUES ('wiki.storage.create', 'wiki.storage.create', 'Upload wiki article files') ON CONFLICT (code) DO NOTHING;
INSERT INTO permissions (name, code, description) VALUES ('wiki.storage.delete', 'wiki.storage.delete', 'Delete wiki article files') ON CONFLICT (code) DO NOTHING;
INSERT INTO permissions (name, code, description) VALUES ('wiki.storage.view', 'wiki.storage.view', 'View wiki article files') ON CONFLICT (code) DO NOTHING;

COMMIT;

