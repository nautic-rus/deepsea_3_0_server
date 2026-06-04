const pool = require('../connection');
const Material = require('./Material');

class MaterialKitItem {
  static async _attachMaterial(rows) {
    if (!Array.isArray(rows) || rows.length === 0) return rows;

    const materialIds = [...new Set(rows.map((row) => Number(row && row.material_id)).filter((id) => !Number.isNaN(id) && id > 0))];
    const materials = materialIds.length > 0 ? await Material.findByIds(materialIds) : [];
    const materialMap = new Map(materials.map((material) => [Number(material.id), material]));

    for (const row of rows) {
      const materialId = Number(row && row.material_id);
      const material = Number.isNaN(materialId) || materialId <= 0 ? null : (materialMap.get(materialId) || null);
      row.material = material
        ? (() => {
          const { statements, ...rest } = material;
          return rest;
        })()
        : null;
    }

    return rows;
  }

  static async list(filters = {}) {
    const { kit_id, page = 1, limit } = filters;
    const offset = limit ? (page - 1) * limit : 0;
    const where = [];
    const values = [];
    let idx = 1;
    if (kit_id) { where.push(`kit_id = $${idx++}`); values.push(kit_id); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    let q = `SELECT id, kit_id, part_code, material_id, quantity, notes, created_at FROM equipment_material_kit_items ${whereSql} ORDER BY id`;
    if (limit != null) {
      q += ` LIMIT $${idx++} OFFSET $${idx}`;
      values.push(limit, offset);
    } else if (offset) {
      q += ` OFFSET $${idx}`;
      values.push(offset);
    }
    const res = await pool.query(q, values);
    return await MaterialKitItem._attachMaterial(res.rows);
  }

  static async findById(id) {
    const q = `SELECT id, kit_id, part_code, material_id, quantity, notes, created_at FROM equipment_material_kit_items WHERE id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    const row = res.rows[0] || null;
    if (!row) return null;
    await MaterialKitItem._attachMaterial([row]);
    return row;
  }

  static async create(fields) {
    const q = `INSERT INTO equipment_material_kit_items (kit_id, part_code, material_id, quantity, notes) VALUES ($1,$2,$3,$4,$5) RETURNING id, kit_id, part_code, material_id, quantity, notes, created_at`;
    const vals = [fields.kit_id, fields.part_code || null, fields.material_id || null, fields.quantity || 1, fields.notes || null];
    const res = await pool.query(q, vals);
    const row = res.rows[0] || null;
    if (!row) return null;
    await MaterialKitItem._attachMaterial([row]);
    return row;
  }

  static async update(id, fields) {
    const parts = [];
    const values = [];
    let idx = 1;
    ['part_code','material_id','quantity','notes'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); values.push(fields[k]); }
    });
    if (parts.length === 0) return await MaterialKitItem.findById(id);
    const q = `UPDATE equipment_material_kit_items SET ${parts.join(', ')} WHERE id = $${idx} RETURNING id, kit_id, part_code, material_id, quantity, notes, created_at`;
    values.push(id);
    const res = await pool.query(q, values);
    const row = res.rows[0] || null;
    if (!row) return null;
    await MaterialKitItem._attachMaterial([row]);
    return row;
  }

  static async softDelete(id) {
    try {
      const q = `UPDATE equipment_material_kit_items SET is_active = false WHERE id = $1`;
      const res = await pool.query(q, [id]);
      if (res.rowCount > 0) return true;
    } catch (err) {}
    const q2 = `DELETE FROM equipment_material_kit_items WHERE id = $1`;
    const res2 = await pool.query(q2, [id]);
    return res2.rowCount > 0;
  }
}

module.exports = MaterialKitItem;
