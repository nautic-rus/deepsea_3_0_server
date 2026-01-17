-- Seed notification methods (idempotent)
-- Inserts common notification delivery methods used by the application.

INSERT INTO public.notification_methods (code, name, description)
VALUES
  ('rocket_chat', 'Rocket.Chat', 'Send notification via Rocket.Chat (chat messages)'),
  ('email', 'Email', 'Send notification via email')
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description;

-- Check contents
SELECT * FROM public.notification_methods ORDER BY id;
