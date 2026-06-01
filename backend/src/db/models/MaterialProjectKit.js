const pool = require('../connection');

class MaterialProjectKit {
  static _toIntArray(v) {
    if (v === null || typeof v === 'undefined' || v === '') return [];
    const arr = Array.isArray(v) ? v : String(v).split(',');
    return arr.map((x) => Number(x)).filter((n) => !Number.isNaN(n) && n > 0);
  }

  static async listByMaterialProjectIds(materialProjectIds = []) {
    const ids = [...new Set(MaterialProjectKit._toIntArray(materialProjectIds))];
    if (ids.length === 0) return [];
    const q = `
      SELECT id, material_project_id, material_kit_id, created_at
      FROM equipment_materials_project_kits
      WHERE material_project_id = ANY($1::int[])
      ORDER BY material_project_id, id`;
    const res = await pool.query(q, [ids]);
    return res.rows || [];
  }

  static async listByMaterialProjectId(materialProjectId) {
    const rows = await MaterialProjectKit.listByMaterialProjectIds([materialProjectId]);
    return rows.filter((row) => Number(row.material_project_id) === Number(materialProjectId));
  }

  static async replaceForMaterialProject(materialProjectId, kitIds = []) {
    const normalizedKitIds = [...new Set(MaterialProjectKit._toIntArray(kitIds))];
    await pool.query('DELETE FROM equipment_materials_project_kits WHERE material_project_id = $1', [Number(materialProjectId)]);
    if (normalizedKitIds.length === 0) return [];

    const placeholders = [];
    const values = [];
    let idx = 1;
    for (const kitId of normalizedKitIds) {
      placeholders.push(`($${idx++}, $${idx++})`);
      values.push(Number(materialProjectId), kitId);
    }
    await pool.query(
      `INSERT INTO equipment_materials_project_kits (material_project_id, material_kit_id) VALUES ${placeholders.join(', ')}`,
      values
    );
    return await MaterialProjectKit.listByMaterialProjectId(materialProjectId);
  }
}

module.exports = MaterialProjectKit;
