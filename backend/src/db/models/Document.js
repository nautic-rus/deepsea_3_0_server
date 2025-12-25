const pool = require('../connection');

class Document {
  static async list(filters = {}) {
    const { project_id, stage_id, specialization_id, directory_id, page = 1, limit = 50, search } = filters;
    const offset = (page - 1) * limit;
    const where = [];
    const values = [];
    let idx = 1;
    if (project_id) { where.push(`project_id = $${idx++}`); values.push(project_id); }
    if (stage_id) { where.push(`stage_id = $${idx++}`); values.push(stage_id); }
    if (specialization_id) { where.push(`specialization_id = $${idx++}`); values.push(specialization_id); }
    if (directory_id) { where.push(`directory_id = $${idx++}`); values.push(directory_id); }
    if (search) { where.push(`(title ILIKE $${idx} OR description ILIKE $${idx})`); values.push(`%${search}%`); idx++; }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const q = `SELECT id, title, description, project_id, stage_id, status_id, specialization_id, directory_id, created_by, created_at FROM documents ${whereSql} ORDER BY id LIMIT $${idx++} OFFSET $${idx}`;
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
