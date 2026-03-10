-- Add status boolean columns to notification events and methods
ALTER TABLE public.notification_events ADD COLUMN IF NOT EXISTS status boolean NOT NULL DEFAULT true;
ALTER TABLE public.notification_methods ADD COLUMN IF NOT EXISTS status boolean NOT NULL DEFAULT true;

-- Backfill existing rows to true (redundant with DEFAULT but safe)
UPDATE public.notification_events SET status = true WHERE status IS NULL;
UPDATE public.notification_methods SET status = true WHERE status IS NULL;
