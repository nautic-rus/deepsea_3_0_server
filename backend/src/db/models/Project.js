const pool = require('../connection');

class Project {
  static async list({ page = 1, limit = 50, search, owner_id, status } = {}) {
    const offset = (page - 1) * limit;
    const where = [];
    const values = [];
    let idx = 1;
    if (owner_id) { where.push(`owner_id = $${idx++}`); values.push(owner_id); }
    if (status) { where.push(`status = $${idx++}`); values.push(status); }
    if (search) { where.push(`(name ILIKE $${idx} OR description ILIKE $${idx})`); values.push(`%${search}%`); idx++; }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const q = `SELECT id, name, description, code, status, owner_id, created_at FROM projects ${whereSql} ORDER BY id LIMIT $${idx++} OFFSET $${idx}`;
    values.push(limit, offset);
    const res = await pool.query(q, values);
    return res.rows;
  }

  // List projects that are assigned to a given user (via user_projects join table)
  static async listForUser(userId, { page = 1, limit = 50, search, owner_id, status } = {}) {
    const offset = (page - 1) * limit;
    // Build filters; membership is determined via user_roles entries
    const values = [userId];
    let idx = 2;
    const where = [`t.project_id IS NOT NULL`];
    if (owner_id) { where.push(`p.owner_id = $${idx++}`); values.push(owner_id); }
    if (status) { where.push(`p.status = $${idx++}`); values.push(status); }
    if (search) { where.push(`(p.name ILIKE $${idx} OR p.description ILIKE $${idx})`); values.push(`%${search}%`); idx++; }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const q = `SELECT p.id, p.name, p.description, p.code, p.status, p.owner_id, p.created_at
      FROM projects p
      JOIN (
        SELECT project_id FROM user_roles WHERE user_id = $1
      ) t ON t.project_id = p.id
      ${whereSql}
      ORDER BY p.id
      LIMIT $${idx++} OFFSET $${idx}`;
    values.push(limit, offset);
    const res = await pool.query(q, values);
    return res.rows;
  }

  static async findById(id) {
    const q = `SELECT id, name, description, code, status, owner_id, created_at FROM projects WHERE id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    return res.rows[0] || null;
  }

  static async isUserAssigned(projectId, userId) {
    // Check assignment via user_roles (role entries scoped to a project)
    const q = `SELECT 1 FROM user_roles WHERE project_id = $1 AND user_id = $2 LIMIT 1`;
    const res = await pool.query(q, [projectId, userId]);
    return res.rows.length > 0;
  }

  static async listAssignedProjectIds(userId) {
    // The `user_projects` table has been removed. Project membership is
    // represented via `user_roles` (project-scoped role assignments).
    const q = `SELECT DISTINCT project_id FROM user_roles WHERE user_id = $1 AND project_id IS NOT NULL`;
    const res = await pool.query(q, [userId]);
    return res.rows.map(r => r.project_id);
  }

  static async create({ name, description, code, owner_id }) {
    const q = `INSERT INTO projects (name, description, code, owner_id) VALUES ($1, $2, $3, $4) RETURNING id, name, description, code, status, owner_id, created_at`;
    const res = await pool.query(q, [name, description, code, owner_id]);
    return res.rows[0];
  }

  static async update(id, fields) {
    const parts = [];
    const values = [];
    let idx = 1;
    ['name','description','status','code','owner_id'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); values.push(fields[k]); }
    });
    if (parts.length === 0) return await Project.findById(id);
    const q = `UPDATE projects SET ${parts.join(', ')} WHERE id = $${idx} RETURNING id, name, description, code, status, owner_id, created_at`;
    values.push(id);
    const res = await pool.query(q, values);
    return res.rows[0] || null;
  }

  static async softDelete(id) {
    try {
      const q = `UPDATE projects SET is_active = false WHERE id = $1`;
      const res = await pool.query(q, [id]);
      if (res.rowCount > 0) return true;
    } catch (err) {}
    const q2 = `DELETE FROM projects WHERE id = $1`;
    const res2 = await pool.query(q2, [id]);
    return res2.rowCount > 0;
  }
}

module.exports = Project;
