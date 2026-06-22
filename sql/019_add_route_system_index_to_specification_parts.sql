ALTER TABLE public.specification_parts
  ADD COLUMN IF NOT EXISTS route text,
  ADD COLUMN IF NOT EXISTS system text,
  ADD COLUMN IF NOT EXISTS index text;
