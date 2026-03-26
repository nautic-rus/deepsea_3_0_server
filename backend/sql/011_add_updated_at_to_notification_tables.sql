-- Add updated_at columns to notification tables so updates can set timestamps
ALTER TABLE public.notification_events
  ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE public.notification_methods
  ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP;

-- Backfill updated_at from created_at when available
UPDATE public.notification_events SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE public.notification_methods SET updated_at = created_at WHERE updated_at IS NULL;
