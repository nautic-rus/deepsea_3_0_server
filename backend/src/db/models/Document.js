const pool = require('../connection');

class Document {
  static async list(filters = {}, allowedProjectIds = null) {
    // filters: support common document attributes and pagination
    const {
      id,
      project_id,
      stage_id,
      specialization_id,
      directory_id,
      status_id,
      created_by,
      is_active,
      created_before,
      created_after,
      title,
      description,
      search,
      page = 1,
      limit = 50,
    } = filters;

    const offset = (page - 1) * limit;
    const where = [];
    const values = [];
    let idx = 1;

    // Exact / equality filters
    if (id !== undefined) { where.push(`id = $${idx++}`); values.push(id); }
    if (project_id !== undefined) { where.push(`project_id = $${idx++}`); values.push(project_id); }
    if (stage_id !== undefined) { where.push(`stage_id = $${idx++}`); values.push(stage_id); }
    if (specialization_id !== undefined) { where.push(`specialization_id = $${idx++}`); values.push(specialization_id); }
    if (directory_id !== undefined) { where.push(`directory_id = $${idx++}`); values.push(directory_id); }
    if (status_id !== undefined) { where.push(`status_id = $${idx++}`); values.push(status_id); }
    if (created_by !== undefined) { where.push(`created_by = $${idx++}`); values.push(created_by); }
    if (is_active !== undefined) { where.push(`is_active = $${idx++}`); values.push(is_active); }

    // created_at range
    if (created_before) { where.push(`created_at <= $${idx++}`); values.push(created_before); }
    if (created_after) { where.push(`created_at >= $${idx++}`); values.push(created_after); }

    // Textual filters: title/description; use ILIKE for partial matches
    if (title) { where.push(`title ILIKE $${idx++}`); values.push(`%${title}%`); }
    if (description) { where.push(`description ILIKE $${idx++}`); values.push(`%${description}%`); }

    // Generic search across title/description (preserves existing behaviour)
    if (search) { where.push(`(title ILIKE $${idx} OR description ILIKE $${idx})`); values.push(`%${search}%`); idx++; }

    // Restrict to allowedProjectIds if provided (array)
    if (Array.isArray(allowedProjectIds) && allowedProjectIds.length > 0) {
      where.push(`project_id = ANY($${idx++})`);
      values.push(allowedProjectIds);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const q = `SELECT id, title, description, project_id, stage_id, status_id, specialization_id, directory_id, created_by, created_at, is_active FROM documents ${whereSql} ORDER BY id LIMIT $${idx++} OFFSET $${idx}`;
    values.push(limit, offset);
    const res = await pool.query(q, values);
    return res.rows;
  }

  static async findById(id) {
    const q = `SELECT id, title, description, project_id, stage_id, status_id, specialization_id, directory_id, created_by, created_at FROM documents WHERE id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    return res.rows[0] || null;
  }

  static async create(fields) {
    const q = `INSERT INTO documents (title, description, project_id, stage_id, specialization_id, directory_id, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, title, description, project_id, stage_id, status_id, specialization_id, directory_id, created_by, created_at`;
    const vals = [fields.title, fields.description, fields.project_id, fields.stage_id, fields.specialization_id, fields.directory_id, fields.created_by];
    const res = await pool.query(q, vals);
    return res.rows[0];
  }

  static async update(id, fields) {
    const parts = [];
    const values = [];
    let idx = 1;
    ['title','description','stage_id','specialization_id','directory_id','status_id'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); values.push(fields[k]); }
    });
    if (parts.length === 0) return await Document.findById(id);
    const q = `UPDATE documents SET ${parts.join(', ')} WHERE id = $${idx} RETURNING id, title, description, project_id, stage_id, status_id, specialization_id, directory_id, created_by, created_at`;
    values.push(id);
    const res = await pool.query(q, values);
    return res.rows[0] || null;
  }

  static async softDelete(id) {
    try {
      const q = `UPDATE documents SET is_active = false WHERE id = $1`;
      const res = await pool.query(q, [id]);
      if (res.rowCount > 0) return true;
    } catch (err) {}
    const q2 = `DELETE FROM documents WHERE id = $1`;
    const res2 = await pool.query(q2, [id]);
    return res2.rowCount > 0;
  }
}

module.exports = Document;
