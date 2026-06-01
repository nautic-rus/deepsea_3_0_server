const pool = require('../connection');

class MaterialKit {
  static _formatUser(firstName, lastName, middleName, avatarId, id) {
    const name = [lastName, firstName, middleName]
      .map((part) => (part == null ? '' : String(part).trim()))
      .filter(Boolean)
      .join(' ')
      .trim() || null;
    return id ? { id, name, avatar_id: avatarId ?? null } : null;
  }

  static _formatProject(row) {
    if (!row || row.project_id === null || row.project_id === undefined) return null;
    return {
      id: row.project_id,
      code: row.project_code || null,
      name: row.project_name || null,
    };
  }

  static _shapeRow(row) {
    if (!row) return row;
    return {
      id: row.id,
      project_id: row.project_id ?? null,
      project: MaterialKit._formatProject(row),
      code: row.code,
      name: row.name,
      description: row.description,
      created_by: MaterialKit._formatUser(
        row.created_by_first_name,
        row.created_by_last_name,
        row.created_by_middle_name,
        row.created_by_avatar_id,
        row.created_by
      ),
      updated_by: MaterialKit._formatUser(
        row.updated_by_first_name,
        row.updated_by_last_name,
        row.updated_by_middle_name,
        row.updated_by_avatar_id,
        row.updated_by
      ),
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  static async list(filters = {}) {
    const { page = 1, limit, search, project_id, allowed_project_ids } = filters;
    const offset = limit ? (page - 1) * limit : 0;
    const where = [];
    const values = [];
    let idx = 1;
    if (search) { where.push(`(name ILIKE $${idx} OR code ILIKE $${idx})`); values.push(`%${search}%`); idx++; }
    const toIntArray = (v) => {
      if (v === null || typeof v === 'undefined' || v === '') return [];
      const arr = Array.isArray(v) ? v : [v];
      return arr.map((x) => Number(x)).filter((n) => !Number.isNaN(n));
    };
    const requestedProjectIds = toIntArray(project_id);
    const allowedProjectIds = toIntArray(allowed_project_ids);
    if (requestedProjectIds.length > 0) {
      where.push(`(project_id IS NULL OR project_id = ANY($${idx++}::int[]))`);
      values.push(requestedProjectIds);
    } else if (allowedProjectIds.length > 0) {
      where.push(`(project_id IS NULL OR project_id = ANY($${idx++}::int[]))`);
      values.push(allowedProjectIds);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    let q = `
      SELECT
        ek.id,
        ek.project_id,
        p.code AS project_code,
        p.name AS project_name,
        ek.code,
        ek.name,
        ek.description,
        ek.created_by,
        c.first_name AS created_by_first_name,
        c.last_name AS created_by_last_name,
        c.middle_name AS created_by_middle_name,
        c.avatar_id AS created_by_avatar_id,
        ek.updated_by,
        u.first_name AS updated_by_first_name,
        u.last_name AS updated_by_last_name,
        u.middle_name AS updated_by_middle_name,
        u.avatar_id AS updated_by_avatar_id,
        ek.created_at,
        ek.updated_at
      FROM equipment_material_kits ek
      LEFT JOIN projects p ON p.id = ek.project_id
      LEFT JOIN users c ON c.id = ek.created_by
      LEFT JOIN users u ON u.id = ek.updated_by
      ${whereSql}
      ORDER BY ek.id`;
    if (limit != null) {
      q += ` LIMIT $${idx++} OFFSET $${idx}`;
      values.push(limit, offset);
    } else if (offset) {
      q += ` OFFSET $${idx}`;
      values.push(offset);
    }
    const res = await pool.query(q, values);
    return res.rows.map((row) => MaterialKit._shapeRow(row));
  }

  static async findById(id) {
    const q = `
      SELECT
        ek.id,
        ek.project_id,
        p.code AS project_code,
        p.name AS project_name,
        ek.code,
        ek.name,
        ek.description,
        ek.created_by,
        c.first_name AS created_by_first_name,
        c.last_name AS created_by_last_name,
        c.middle_name AS created_by_middle_name,
        c.avatar_id AS created_by_avatar_id,
        ek.updated_by,
        u.first_name AS updated_by_first_name,
        u.last_name AS updated_by_last_name,
        u.middle_name AS updated_by_middle_name,
        u.avatar_id AS updated_by_avatar_id,
        ek.created_at,
        ek.updated_at
      FROM equipment_material_kits ek
      LEFT JOIN projects p ON p.id = ek.project_id
      LEFT JOIN users c ON c.id = ek.created_by
      LEFT JOIN users u ON u.id = ek.updated_by
      WHERE ek.id = $1
      LIMIT 1`;
    const res = await pool.query(q, [id]);
    return MaterialKit._shapeRow(res.rows[0] || null);
  }

  static async findByIds(ids = []) {
    const uniqueIds = [...new Set((ids || []).map((id) => Number(id)).filter((id) => !Number.isNaN(id) && id > 0))];
    if (uniqueIds.length === 0) return [];
    const q = `
      SELECT
        ek.id,
        ek.project_id,
        p.code AS project_code,
        p.name AS project_name,
        ek.code,
        ek.name,
        ek.description,
        ek.created_by,
        c.first_name AS created_by_first_name,
        c.last_name AS created_by_last_name,
        c.middle_name AS created_by_middle_name,
        c.avatar_id AS created_by_avatar_id,
        ek.updated_by,
        u.first_name AS updated_by_first_name,
        u.last_name AS updated_by_last_name,
        u.middle_name AS updated_by_middle_name,
        u.avatar_id AS updated_by_avatar_id,
        ek.created_at,
        ek.updated_at
      FROM equipment_material_kits ek
      LEFT JOIN projects p ON p.id = ek.project_id
      LEFT JOIN users c ON c.id = ek.created_by
      LEFT JOIN users u ON u.id = ek.updated_by
      WHERE ek.id = ANY($1::int[])
      ORDER BY ek.id`;
    const res = await pool.query(q, [uniqueIds]);
    return res.rows.map((row) => MaterialKit._shapeRow(row));
  }

  static async create(fields) {
    const q = `INSERT INTO equipment_material_kits (project_id, code, name, description, created_by, updated_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, project_id, code, name, description, created_by, updated_by, created_at, updated_at`;
    const vals = [fields.project_id || null, fields.code, fields.name, fields.description || null, fields.created_by, fields.updated_by || null];
    const res = await pool.query(q, vals);
    return await MaterialKit.findById(res.rows[0].id);
  }

  static async update(id, fields) {
    const parts = [];
    const values = [];
    let idx = 1;
    ['project_id','code','name','description','updated_by'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); values.push(fields[k]); }
    });
    if (parts.length === 0) return await MaterialKit.findById(id);
    const q = `UPDATE equipment_material_kits SET ${parts.join(', ')} WHERE id = $${idx} RETURNING id, project_id, code, name, description, created_by, updated_by, created_at, updated_at`;
    values.push(id);
    const res = await pool.query(q, values);
    return res.rows[0] ? await MaterialKit.findById(id) : null;
  }

  static async softDelete(id) {
    try {
      const q = `UPDATE equipment_material_kits SET is_active = false WHERE id = $1`;
      const res = await pool.query(q, [id]);
      if (res.rowCount > 0) return true;
    } catch (err) {}
    const q2 = `DELETE FROM equipment_material_kits WHERE id = $1`;
    const res2 = await pool.query(q2, [id]);
    return res2.rowCount > 0;
  }
}

module.exports = MaterialKit;
