-- Migration: add radius and angle to specification_parts for SYSTEMS import.

ALTER TABLE IF EXISTS public.specification_parts
  ADD COLUMN IF NOT EXISTS radius numeric,
  ADD COLUMN IF NOT EXISTS angle numeric;
