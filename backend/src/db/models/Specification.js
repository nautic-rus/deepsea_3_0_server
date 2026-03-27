const pool = require('../connection');

class Specification {
  static async list(filters = {}) {
    const { project_id, page = 1, limit, search } = filters;
    const offset = limit ? (page - 1) * limit : 0;
    const where = [];
    const values = [];
    let idx = 1;
    if (project_id) { where.push(`project_id = $${idx++}`); values.push(project_id); }
    if (search) { where.push(`(name ILIKE $${idx} OR description ILIKE $${idx})`); values.push(`%${search}%`); idx++; }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    let q = `SELECT specification.id, specification.code, specification.name, specification.description, specification.created_at,
      row_to_json(p.*) AS project,
      row_to_json(d.*) AS document,
      json_build_object('id', u.id, 'username', u.username, 'first_name', u.first_name, 'last_name', u.last_name, 'email', u.email, 'avatar_id', u.avatar_id) AS created_by,
      (SELECT version FROM specification_version sv WHERE sv.specification_id = specification.id ORDER BY sv.created_at DESC LIMIT 1) AS version
      FROM specification
      LEFT JOIN projects p ON p.id = specification.project_id
      LEFT JOIN documents d ON d.id = specification.document_id
      LEFT JOIN users u ON u.id = specification.created_by
      ${whereSql} ORDER BY specification.id`;
    if (limit != null) {
      q += ` LIMIT $${idx++} OFFSET $${idx}`;
      values.push(limit, offset);
    } else if (offset) {
      q += ` OFFSET $${idx}`;
      values.push(offset);
    }
    const res = await pool.query(q, values);
    return res.rows;
  }

  static async findById(id) {
    const q = `SELECT specification.id, specification.code, specification.name, specification.description, specification.created_at,
      row_to_json(p.*) AS project,
      row_to_json(d.*) AS document,
      json_build_object('id', u.id, 'username', u.username, 'first_name', u.first_name, 'last_name', u.last_name, 'email', u.email, 'avatar_id', u.avatar_id) AS created_by,
      (SELECT version FROM specification_version sv WHERE sv.specification_id = specification.id ORDER BY sv.created_at DESC LIMIT 1) AS version
      FROM specification
      LEFT JOIN projects p ON p.id = specification.project_id
      LEFT JOIN documents d ON d.id = specification.document_id
      LEFT JOIN users u ON u.id = specification.created_by
      WHERE specification.id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    return res.rows[0] || null;
  }

  static async create(fields) {
    const q = `INSERT INTO specification (project_id, document_id, code, name, description, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, project_id, document_id, code, name, description, created_by, created_at`;
    const vals = [fields.project_id, fields.document_id, fields.code, fields.name, fields.description, fields.created_by];
    const res = await pool.query(q, vals);
    const spec = res.rows[0];
    if (!spec || !spec.id) return spec;
    return await Specification.findById(spec.id);
  }

  static async update(id, fields) {
    const parts = [];
    const values = [];
    let idx = 1;
    ['document_id','code','name','description'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); values.push(fields[k]); }
    });
    if (parts.length === 0) return await Specification.findById(id);
    const q = `UPDATE specification SET ${parts.join(', ')} WHERE id = $${idx} RETURNING id, project_id, document_id, code, name, description, created_by, created_at`;
    values.push(id);
    const res = await pool.query(q, values);
    const updated = res.rows[0] || null;
    if (!updated) return null;
    return await Specification.findById(updated.id);
  }

  static async softDelete(id) {
    try {
      const q = `UPDATE specification SET is_active = false WHERE id = $1`;
      const res = await pool.query(q, [id]);
      if (res.rowCount > 0) return true;
    } catch (err) {}
    const q2 = `DELETE FROM specification WHERE id = $1`;
    const res2 = await pool.query(q2, [id]);
    return res2.rowCount > 0;
  }
}

module.exports = Specification;
