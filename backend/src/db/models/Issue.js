const pool = require('../connection');

class Issue {
  static async list(filters = {}) {
    const { project_id, status_id, assignee_id, page = 1, limit = 50, search } = filters;
    const offset = (page - 1) * limit;
    const where = [];
    const values = [];
    let idx = 1;
    if (project_id) { where.push(`project_id = $${idx++}`); values.push(project_id); }
    if (status_id) { where.push(`status_id = $${idx++}`); values.push(status_id); }
    if (assignee_id) { where.push(`assignee_id = $${idx++}`); values.push(assignee_id); }
    if (search) { where.push(`(title ILIKE $${idx} OR description ILIKE $${idx})`); values.push(`%${search}%`); idx++; }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const q = `SELECT id, project_id, title, description, status_id, type_id, priority, estimated_hours, start_date, due_date, assignee_id, reporter_id, created_at FROM issues ${whereSql} ORDER BY id LIMIT $${idx++} OFFSET $${idx}`;
    values.push(limit, offset);
    const res = await pool.query(q, values);
    return res.rows;
  }

  static async findById(id) {
    const q = `SELECT id, project_id, title, description, status_id, type_id, priority, estimated_hours, start_date, due_date, assignee_id, reporter_id, created_at FROM issues WHERE id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    return res.rows[0] || null;
  }

  static async create(fields) {
    const q = `INSERT INTO issues (project_id, title, description, type_id, priority, estimated_hours, start_date, due_date, assignee_id, reporter_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id, project_id, title, description, status_id, type_id, priority, estimated_hours, start_date, due_date, assignee_id, reporter_id, created_at`;
    const vals = [fields.project_id, fields.title, fields.description, fields.type_id, fields.priority, fields.estimated_hours || 0, fields.start_date, fields.due_date, fields.assignee_id, fields.reporter_id];
    const res = await pool.query(q, vals);
    return res.rows[0];
  }

  static async update(id, fields) {
    const parts = [];
    const values = [];
    let idx = 1;
    ['title','description','priority','estimated_hours','start_date','due_date','assignee_id','status_id'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); values.push(fields[k]); }
    });
    if (parts.length === 0) return await Issue.findById(id);
    const q = `UPDATE issues SET ${parts.join(', ')} WHERE id = $${idx} RETURNING id, project_id, title, description, status_id, type_id, priority, estimated_hours, start_date, due_date, assignee_id, reporter_id, created_at`;
    values.push(id);
    const res = await pool.query(q, values);
    return res.rows[0] || null;
  }

  static async softDelete(id) {
    try {
      const q = `UPDATE issues SET is_active = false WHERE id = $1`;
      const res = await pool.query(q, [id]);
      if (res.rowCount > 0) return true;
    } catch (err) {}
    const q2 = `DELETE FROM issues WHERE id = $1`;
    const res2 = await pool.query(q2, [id]);
    return res2.rowCount > 0;
  }
}

module.exports = Issue;
