-- Add status boolean to pages table
ALTER TABLE pages
  ADD COLUMN IF NOT EXISTS status boolean DEFAULT true;

-- Backfill existing rows to status = true
UPDATE pages SET status = true WHERE status IS NULL;

-- Make sure default is set for future inserts
ALTER TABLE pages ALTER COLUMN status SET DEFAULT true;
