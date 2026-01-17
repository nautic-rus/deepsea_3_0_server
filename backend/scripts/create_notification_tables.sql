-- Migration: create notification_methods, notification_events, user_notification_settings
CREATE TABLE IF NOT EXISTS public.notification_methods (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.notification_events (
  id SERIAL PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.user_notification_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES public.projects(id) ON DELETE CASCADE,
  event_id INTEGER NOT NULL REFERENCES public.notification_events(id) ON DELETE CASCADE,
  method_id INTEGER NOT NULL REFERENCES public.notification_methods(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT TRUE,
  config JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'ux_user_notification_settings_unique'
  ) THEN
    CREATE UNIQUE INDEX ux_user_notification_settings_unique ON public.user_notification_settings(user_id, project_id, event_id, method_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_user_notification_settings_user'
  ) THEN
    CREATE INDEX idx_user_notification_settings_user ON public.user_notification_settings(user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_user_notification_settings_project'
  ) THEN
    CREATE INDEX idx_user_notification_settings_project ON public.user_notification_settings(project_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_user_notification_settings_event'
  ) THEN
    CREATE INDEX idx_user_notification_settings_event ON public.user_notification_settings(event_id);
  END IF;
END$$;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.user_notification_settings_updated_at_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tg_user_notification_settings_updated_at') THEN
    CREATE TRIGGER tg_user_notification_settings_updated_at
    BEFORE UPDATE ON public.user_notification_settings
    FOR EACH ROW EXECUTE FUNCTION public.user_notification_settings_updated_at_trigger();
  END IF;
END$$;
