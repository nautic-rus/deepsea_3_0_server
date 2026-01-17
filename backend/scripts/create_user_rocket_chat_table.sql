-- Create user_rocket_chat table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_rocket_chat (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    rc_username VARCHAR(255) NOT NULL,
    rc_user_id VARCHAR(255),
    rc_display_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure uniqueness where expected
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'ux_user_rocket_chat_user_id'
  ) THEN
    CREATE UNIQUE INDEX ux_user_rocket_chat_user_id ON public.user_rocket_chat(user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'ux_user_rocket_chat_rc_username'
  ) THEN
    CREATE UNIQUE INDEX ux_user_rocket_chat_rc_username ON public.user_rocket_chat(rc_username);
  END IF;
END$$;

-- Optional: small helper to update `updated_at` on change (not mandatory)
CREATE OR REPLACE FUNCTION public.user_rocket_chat_updated_at_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'tg_user_rocket_chat_updated_at'
  ) THEN
    CREATE TRIGGER tg_user_rocket_chat_updated_at
    BEFORE UPDATE ON public.user_rocket_chat
    FOR EACH ROW EXECUTE FUNCTION public.user_rocket_chat_updated_at_trigger();
  END IF;
END$$;
