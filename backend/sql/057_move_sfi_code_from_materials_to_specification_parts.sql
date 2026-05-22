-- Repair migration: move SFI relation from equipment_materials to specification_parts.

BEGIN;

ALTER TABLE IF EXISTS public.specification_parts
  ADD COLUMN IF NOT EXISTS sfi_code_id INTEGER;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'equipment_materials'
      AND column_name = 'sfi_code_id'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'specification_parts'
      AND column_name = 'sfi_code_id'
  ) THEN
    UPDATE public.specification_parts sp
    SET sfi_code_id = m.sfi_code_id
    FROM public.equipment_materials m
    WHERE sp.material_id = m.id
      AND sp.sfi_code_id IS NULL
      AND m.sfi_code_id IS NOT NULL;
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'equipment_materials_sfi_codes_fk'
      AND conrelid = 'public.equipment_materials'::regclass
  ) THEN
    ALTER TABLE public.equipment_materials
      DROP CONSTRAINT equipment_materials_sfi_codes_fk;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'specification_parts_sfi_codes_fk'
      AND conrelid = 'public.specification_parts'::regclass
  ) THEN
    ALTER TABLE public.specification_parts
      ADD CONSTRAINT specification_parts_sfi_codes_fk
      FOREIGN KEY (sfi_code_id) REFERENCES public.sfi_codes(id) ON DELETE SET NULL;
  END IF;
END
$$;

ALTER TABLE IF EXISTS public.equipment_materials
  DROP COLUMN IF EXISTS sfi_code_id;

COMMIT;
