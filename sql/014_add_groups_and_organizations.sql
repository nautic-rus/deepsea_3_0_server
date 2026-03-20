-- Migration: Add groups and organizations tables and link to users
-- Adds `group_id` and `organization_id` to `users` and creates referenced tables

BEGIN;

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create groups table
CREATE TABLE IF NOT EXISTS groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add columns to users if they don't exist
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS group_id INTEGER,
  ADD COLUMN IF NOT EXISTS organization_id INTEGER;

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_users_group_id ON users(group_id);
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);

-- Add foreign key constraints
ALTER TABLE users
  ADD CONSTRAINT IF NOT EXISTS fk_users_group
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL,
  ADD CONSTRAINT IF NOT EXISTS fk_users_organization
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;

COMMIT;

-- Note: Run this migration with your usual migration tooling or `psql`.
