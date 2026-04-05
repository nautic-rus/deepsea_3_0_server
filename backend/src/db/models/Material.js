const pool = require('../connection');

class Material {
  static async list(filters = {}) {
    const { directory_id, unit_id, statement_id, shipment_id, page = 1, limit, search } = filters;
    const offset = limit ? (page - 1) * limit : 0;
    const where = [];
    const values = [];
    let idx = 1;
    if (directory_id) { where.push(`m.directory_id = $${idx++}`); values.push(directory_id); }
    if (unit_id) { where.push(`m.unit_id = $${idx++}`); values.push(unit_id); }
    if (search) { where.push(`(name ILIKE $${idx} OR description ILIKE $${idx})`); values.push(`%${search}%`); idx++; }
    if (statement_id) { where.push(`EXISTS (SELECT 1 FROM statement_materials sm WHERE sm.material_id = m.id AND sm.statement_id = $${idx++})`); values.push(statement_id); }
    if (shipment_id) { where.push(`EXISTS (SELECT 1 FROM shipment_materials sh WHERE sh.material_id = m.id AND sh.shipment_id = $${idx++})`); values.push(shipment_id); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    // join directory, unit (if exists), user names and aggregate related items
      let q = `SELECT m.id, m.stock_code, m.name, m.description, m.directory_id, d.name AS directory_name, m.unit_id, uo.name AS unit_name, m.weight, m.created_by, cu.first_name AS created_by_first_name, cu.last_name AS created_by_last_name, m.created_at, m.updated_by, uu.first_name AS updated_by_first_name, uu.last_name AS updated_by_last_name, m.updated_at,
      COALESCE((SELECT json_agg(sm.statement_id) FROM statement_materials sm WHERE sm.material_id = m.id), '[]') AS statement_materials,
      COALESCE((SELECT json_agg(sh.shipment_id) FROM shipment_materials sh WHERE sh.material_id = m.id), '[]') AS shipment_materials
        FROM equipment_materials m
      LEFT JOIN document_directories d ON m.directory_id = d.id
      LEFT JOIN units uo ON m.unit_id = uo.id
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
      created_by: r.created_by ? { id: r.created_by, name: (r.created_by_first_name || r.created_by_last_name) ? `${r.created_by_first_name || ''} ${r.created_by_last_name || ''}`.trim() : null } : null,
      created_at: r.created_at,
      updated_by: r.updated_by ? { id: r.updated_by, name: (r.updated_by_first_name || r.updated_by_last_name) ? `${r.updated_by_first_name || ''} ${r.updated_by_last_name || ''}`.trim() : null } : null,
      updated_at: r.updated_at,
      statement_materials: r.statement_materials || [],
      shipment_materials: r.shipment_materials || []
    }));
  }

  static async findById(id) {
    const q = `SELECT m.id, m.stock_code, m.name, m.description, m.directory_id, d.name AS directory_name, m.unit_id, uo.name AS unit_name, m.count, m.created_by, cu.first_name AS created_by_first_name, cu.last_name AS created_by_last_name, m.created_at, m.updated_by, uu.first_name AS updated_by_first_name, uu.last_name AS updated_by_last_name, m.updated_at,
      COALESCE((SELECT json_agg(sm.statement_id) FROM statement_materials sm WHERE sm.material_id = m.id), '[]') AS statement_materials,
      COALESCE((SELECT json_agg(sh.shipment_id) FROM shipment_materials sh WHERE sh.material_id = m.id), '[]') AS shipment_materials
        FROM equipment_materials m
      LEFT JOIN document_directories d ON m.directory_id = d.id
      LEFT JOIN units uo ON m.unit_id = uo.id
      LEFT JOIN users cu ON m.created_by = cu.id
      LEFT JOIN users uu ON m.updated_by = uu.id
      WHERE m.id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    const r = res.rows[0];
    if (!r) return null;
    return {
      id: r.id,
      stock_code: r.stock_code,
      name: r.name,
      description: r.description,
      directory: r.directory_id ? { id: r.directory_id, name: r.directory_name } : null,
      unit: r.unit_id ? { id: r.unit_id, name: r.unit_name } : null,
      weight: r.weight,
      created_by: r.created_by ? { id: r.created_by, name: (r.created_by_first_name || r.created_by_last_name) ? `${r.created_by_first_name || ''} ${r.created_by_last_name || ''}`.trim() : null } : null,
      created_at: r.created_at,
      updated_by: r.updated_by ? { id: r.updated_by, name: (r.updated_by_first_name || r.updated_by_last_name) ? `${r.updated_by_first_name || ''} ${r.updated_by_last_name || ''}`.trim() : null } : null,
      updated_at: r.updated_at,
      statement_materials: r.statement_materials || [],
      shipment_materials: r.shipment_materials || []
    };
  }

  static async create(fields) {
    const q = `INSERT INTO equipment_materials (stock_code, name, description, directory_id, unit_id, manufacturer, count, created_by, updated_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`;
    const vals = [fields.stock_code, fields.name, fields.description, fields.directory_id, fields.unit_id, fields.manufacturer, fields.count || 0, fields.created_by, fields.updated_by || null];
    const res = await pool.query(q, vals);
    const newId = res.rows[0] && res.rows[0].id;
    return await Material.findById(newId);
  }

  static async update(id, fields) {
    const parts = [];
    const values = [];
    let idx = 1;
    ['stock_code','name','description','directory_id','unit_id','manufacturer','count','updated_by'].forEach((k) => {
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
