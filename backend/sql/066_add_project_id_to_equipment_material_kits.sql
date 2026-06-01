-- Add project binding to equipment material kits.

BEGIN;

ALTER TABLE IF EXISTS public.equipment_material_kits
  ADD COLUMN IF NOT EXISTS project_id INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'equipment_material_kits_project_id_fkey'
      AND conrelid = 'public.equipment_material_kits'::regclass
  ) THEN
    ALTER TABLE public.equipment_material_kits
      ADD CONSTRAINT equipment_material_kits_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;
  END IF;
END
$$;

COMMIT;
