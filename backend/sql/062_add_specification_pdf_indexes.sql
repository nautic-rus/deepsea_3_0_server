-- Improves performance of specification PDF generation on large production datasets.
-- These indexes support the two hottest queries used by GET /api/specification_versions/:id/pdf:
-- - fetch all parts for a given specification version, ordered by part id
-- - resolve the latest statement per material from equipment_materials_projects

CREATE INDEX IF NOT EXISTS idx_specification_parts_specification_version_id_id
  ON specification_parts (specification_version_id, id);

CREATE INDEX IF NOT EXISTS idx_equipment_materials_projects_equipment_material_id_id_desc
  ON equipment_materials_projects (equipment_material_id, id DESC);
