-- Create table for user-visible notifications (notification center)
-- Idempotent: uses IF NOT EXISTS and IF NOT EXISTS for indexes

CREATE TABLE IF NOT EXISTS public.user_notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  event_code TEXT,
  project_id INTEGER,
  data JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- FKs are optional depending on users table naming; keep safe by not adding FK constraint here.

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON public.user_notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id_is_read ON public.user_notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id_is_hidden ON public.user_notifications (user_id, is_hidden);
