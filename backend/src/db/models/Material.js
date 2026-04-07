const pool = require('../connection');

class Material {
  static async list(filters = {}) {
    const { directory_id, unit_id, shipment_id, type, status, page = 1, limit, search } = filters;
    const offset = limit ? (page - 1) * limit : 0;
    const where = [];
    const values = [];
    let idx = 1;
    if (directory_id) { where.push(`m.directory_id = $${idx++}`); values.push(directory_id); }
    if (unit_id) { where.push(`m.unit_id = $${idx++}`); values.push(unit_id); }
    if (type) { where.push(`m.type = $${idx++}`); values.push(type); }
    if (status) { where.push(`m.status = $${idx++}`); values.push(status); }
    if (search) { where.push(`(m.name ILIKE $${idx} OR m.description ILIKE $${idx} OR m.stock_code ILIKE $${idx})`); values.push(`%${search}%`); idx++; }
    if (shipment_id) { where.push(`EXISTS (SELECT 1 FROM shipment_materials sh WHERE sh.material_id = m.id AND sh.shipment_id = $${idx++})`); values.push(shipment_id); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    let q = `SELECT m.id, m.stock_code, m.name, m.description, m.directory_id, d.name AS directory_name, m.unit_id, uo.name AS unit_name, m.weight, m.sfi_code_id, sc.code AS sfi_code_code, sc.name_ru AS sfi_code_name_ru, sc.name_en AS sfi_code_name_en, m.type, m.status, m.created_by, cu.first_name AS created_by_first_name, cu.last_name AS created_by_last_name, cu.avatar_id AS created_by_avatar_id, m.created_at, m.updated_by, uu.first_name AS updated_by_first_name, uu.last_name AS updated_by_last_name, uu.avatar_id AS updated_by_avatar_id, m.updated_at
        FROM equipment_materials m
      LEFT JOIN equipment_materials_directories d ON m.directory_id = d.id
      LEFT JOIN units uo ON m.unit_id = uo.id
      LEFT JOIN sfi_codes sc ON m.sfi_code_id = sc.id
      LEFT JOIN users cu ON m.created_by = cu.id
      LEFT JOIN users uu ON m.updated_by = uu.id
      ${whereSql} ORDER BY m.id`;
    if (limit != null) {
      q += ` LIMIT $${idx++} OFFSET $${idx}`;
      values.push(limit, offset);
    } else if (offset) {
      q += ` OFFSET $${idx}`;
      values.push(offset);
    }
    const res = await pool.query(q, values);
    return res.rows.map((r) => ({
      id: r.id,
      stock_code: r.stock_code,
      name: r.name,
      description: r.description,
      directory: r.directory_id ? { id: r.directory_id, name: r.directory_name } : null,
      unit: r.unit_id ? { id: r.unit_id, name: r.unit_name } : null,
      weight: r.weight,
      sfi_code: r.sfi_code_id ? { id: r.sfi_code_id, code: r.sfi_code_code || null, name_ru: r.sfi_code_name_ru || null, name_en: r.sfi_code_name_en || null } : null,
      type: r.type,
      status: r.status,
      created_by: r.created_by ? { id: r.created_by, name: (r.created_by_first_name || r.created_by_last_name) ? `${r.created_by_first_name || ''} ${r.created_by_last_name || ''}`.trim() : null, avatar_id: r.created_by_avatar_id || null } : null,
      created_at: r.created_at,
      updated_by: r.updated_by ? { id: r.updated_by, name: (r.updated_by_first_name || r.updated_by_last_name) ? `${r.updated_by_first_name || ''} ${r.updated_by_last_name || ''}`.trim() : null, avatar_id: r.updated_by_avatar_id || null } : null,
      updated_at: r.updated_at,
    }));
  }

  static async findById(id) {
    const q = `SELECT m.id, m.stock_code, m.name, m.description, m.directory_id, d.name AS directory_name, m.unit_id, uo.name AS unit_name, m.weight, m.sfi_code_id, sc.code AS sfi_code_code, sc.name_ru AS sfi_code_name_ru, sc.name_en AS sfi_code_name_en, m.type, m.status, m.created_by, cu.first_name AS created_by_first_name, cu.last_name AS created_by_last_name, cu.avatar_id AS created_by_avatar_id, m.created_at, m.updated_by, uu.first_name AS updated_by_first_name, uu.last_name AS updated_by_last_name, uu.avatar_id AS updated_by_avatar_id, m.updated_at
        FROM equipment_materials m
      LEFT JOIN equipment_materials_directories d ON m.directory_id = d.id
      LEFT JOIN units uo ON m.unit_id = uo.id
      LEFT JOIN sfi_codes sc ON m.sfi_code_id = sc.id
      LEFT JOIN users cu ON m.created_by = cu.id
      LEFT JOIN users uu ON m.updated_by = uu.id
      WHERE m.id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    const r = res.rows[0];
    if (!r) return null;
    // fetch related equipment_materials_projects entries
    const projQ = `SELECT p.id, p.statement_id, p.shipments_id, p.created_at, s.code AS statement_code, s.name AS statement_name, s.project_id AS statement_project_id, sh.id AS shipment_id, sh.supplier_id AS shipment_supplier_id, sh.code AS shipment_code FROM equipment_materials_projects p LEFT JOIN statements s ON p.statement_id = s.id LEFT JOIN shipments sh ON p.shipments_id = sh.id WHERE p.equipment_material_id = $1 ORDER BY p.id DESC`;
    const projRes = await pool.query(projQ, [id]);
    const projects = (projRes.rows || []).map((p) => ({
      id: p.id,
      created_at: p.created_at,
      statement: p.statement_id ? { id: p.statement_id, code: p.statement_code || null, name: p.statement_name || null, project_id: p.statement_project_id || null } : null,
      shipments: p.shipment_id ? { id: p.shipment_id, supplier_id: p.shipment_supplier_id || null, code: p.shipment_code || null } : null
    }));

    return {
      id: r.id,
      stock_code: r.stock_code,
      name: r.name,
      description: r.description,
      directory: r.directory_id ? { id: r.directory_id, name: r.directory_name } : null,
      unit: r.unit_id ? { id: r.unit_id, name: r.unit_name } : null,
      weight: r.weight,
      sfi_code: r.sfi_code_id ? { id: r.sfi_code_id, code: r.sfi_code_code || null, name_ru: r.sfi_code_name_ru || null, name_en: r.sfi_code_name_en || null } : null,
      type: r.type,
      status: r.status,
      created_by: r.created_by ? { id: r.created_by, name: (r.created_by_first_name || r.created_by_last_name) ? `${r.created_by_first_name || ''} ${r.created_by_last_name || ''}`.trim() : null, avatar_id: r.created_by_avatar_id || null } : null,
      created_at: r.created_at,
      updated_by: r.updated_by ? { id: r.updated_by, name: (r.updated_by_first_name || r.updated_by_last_name) ? `${r.updated_by_first_name || ''} ${r.updated_by_last_name || ''}`.trim() : null, avatar_id: r.updated_by_avatar_id || null } : null,
      updated_at: r.updated_at,
      projects
    };
  }

  static async create(fields) {
    const q = `INSERT INTO equipment_materials (stock_code, name, description, directory_id, unit_id, weight, sfi_code_id, type, status, created_by, updated_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`;
    const vals = [fields.stock_code, fields.name, fields.description || null, fields.directory_id, fields.unit_id || null, fields.weight ?? 0, fields.sfi_code_id || null, fields.type || 'material', fields.status || 'active', fields.created_by, fields.updated_by || null];
    const res = await pool.query(q, vals);
    const newId = res.rows[0] && res.rows[0].id;
    return await Material.findById(newId);
  }

  static async update(id, fields) {
    const parts = [];
    const values = [];
    let idx = 1;
    ['stock_code','name','description','directory_id','unit_id','weight','sfi_code_id','type','status','updated_by'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); values.push(fields[k]); }
    });
    if (parts.length === 0) return await Material.findById(id);
    // always update updated_at timestamp when performing update
    const q = `UPDATE equipment_materials SET ${parts.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING id`;
    values.push(id);
    const res = await pool.query(q, values);
    const updatedId = res.rows[0] && res.rows[0].id;
    return await Material.findById(updatedId);
  }

  static async softDelete(id) {
    try {
      const q = `UPDATE equipment_materials SET is_active = false WHERE id = $1`;
      const res = await pool.query(q, [id]);
      if (res.rowCount > 0) return true;
    } catch (err) {}
    const q2 = `DELETE FROM equipment_materials WHERE id = $1`;
    const res2 = await pool.query(q2, [id]);
    return res2.rowCount > 0;
  }
}

module.exports = Material;
