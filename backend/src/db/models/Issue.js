const pool = require('../connection');

/**
 * Issue data access object.
 *
 * Provides CRUD and listing operations for issues stored in the database.
 * Methods accept/return plain JS objects representing issue rows.
 */
class Issue {
  /**
   * List issues with optional filtering and pagination.
   *
   * @param {Object} filters - Filter and pagination options (project_id, status_id, assignee_id, author_id, page, limit, search, date ranges, etc.)
   * @returns {Promise<Array<Object>>} Array of issue objects matching filters
   */
  static async list(filters = {}) {
    const { project_id, status_id, assignee_id, type_id, priority, estimated_hours, author_id, is_closed, is_active, page = 1, limit = 50, search, start_date_from, start_date_to, due_date_from, due_date_to, estimated_hours_min, estimated_hours_max, allowed_project_ids } = filters;
    const offset = (page - 1) * limit;
    const where = [];
    const values = [];
    let idx = 1;
    if (project_id) { where.push(`project_id = $${idx++}`); values.push(project_id); }
    if (status_id) { where.push(`status_id = $${idx++}`); values.push(status_id); }
    // is_closed: map to issue_status.is_final boolean flag
    if (is_closed !== undefined && is_closed !== null) {
      where.push(`status_id IN (SELECT id FROM issue_status WHERE is_final = $${idx++})`);
      values.push(is_closed);
    }
    if (assignee_id) { where.push(`assignee_id = $${idx++}`); values.push(assignee_id); }
  if (is_active !== undefined) { where.push(`is_active = $${idx++}`); values.push(is_active); }
    if (type_id) { where.push(`type_id = $${idx++}`); values.push(type_id); }
    if (priority) { where.push(`priority = $${idx++}`); values.push(priority); }
    if (estimated_hours !== undefined && estimated_hours !== null) { where.push(`estimated_hours = $${idx++}`); values.push(estimated_hours); }
    if (author_id) { where.push(`author_id = $${idx++}`); values.push(author_id); }
    if (search) { where.push(`(title ILIKE $${idx} OR description ILIKE $${idx})`); values.push(`%${search}%`); idx++; }
    if (start_date_from) { where.push(`start_date >= $${idx++}`); values.push(start_date_from); }
    if (start_date_to) { where.push(`start_date <= $${idx++}`); values.push(start_date_to); }
    if (due_date_from) { where.push(`due_date >= $${idx++}`); values.push(due_date_from); }
    if (due_date_to) { where.push(`due_date <= $${idx++}`); values.push(due_date_to); }
    if (estimated_hours_min) { where.push(`estimated_hours >= $${idx++}`); values.push(estimated_hours_min); }
    if (estimated_hours_max) { where.push(`estimated_hours <= $${idx++}`); values.push(estimated_hours_max); }
    if (allowed_project_ids && Array.isArray(allowed_project_ids) && allowed_project_ids.length > 0) { where.push(`project_id = ANY($${idx}::int[])`); values.push(allowed_project_ids); idx++; }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const q = `SELECT id, project_id, title, description, status_id, type_id, priority, estimated_hours, start_date, due_date, assignee_id, author_id, created_at FROM issues ${whereSql} ORDER BY id LIMIT $${idx++} OFFSET $${idx}`;
    values.push(limit, offset);
    const res = await pool.query(q, values);
    return res.rows;
  }

  /**
   * Find a single issue by its ID.
   *
   * @param {number} id - Issue ID
   * @returns {Promise<Object|null>} Issue object or null if not found
   */
  static async findById(id) {
    const q = `SELECT id, project_id, title, description, status_id, type_id, priority, estimated_hours, start_date, due_date, assignee_id, author_id, created_at FROM issues WHERE id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    return res.rows[0] || null;
  }

  /**
   * Create a new issue.
   *
   * @param {Object} fields - Issue fields (project_id, title, description, type_id, priority, estimated_hours, start_date, due_date, assignee_id, author_id)
   * @returns {Promise<Object>} Newly created issue object
   */
  static async create(fields) {
    // DB column is currently named author_id in schema file; accept fields.author_id from API and store into that column
    const q = `INSERT INTO issues (project_id, title, description, type_id, priority, estimated_hours, start_date, due_date, assignee_id, author_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id, project_id, title, description, status_id, type_id, priority, estimated_hours, start_date, due_date, assignee_id, author_id, created_at`;
    const vals = [fields.project_id, fields.title, fields.description, fields.type_id, fields.priority, fields.estimated_hours || 0, fields.start_date, fields.due_date, fields.assignee_id, fields.author_id];
    const res = await pool.query(q, vals);
    return res.rows[0];
  }

  /**
   * Update an existing issue's mutable fields.
   *
   * @param {number} id - Issue ID to update
   * @param {Object} fields - Fields to update (title, description, priority, estimated_hours, start_date, due_date, assignee_id, status_id)
   * @returns {Promise<Object|null>} Updated issue object or null if not found
   */
  static async update(id, fields) {
    const parts = [];
    const values = [];
    let idx = 1;
    ['title','description','priority','estimated_hours','start_date','due_date','assignee_id','status_id'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); values.push(fields[k]); }
    });
    if (parts.length === 0) return await Issue.findById(id);
  const q = `UPDATE issues SET ${parts.join(', ')} WHERE id = $${idx} RETURNING id, project_id, title, description, status_id, type_id, priority, estimated_hours, start_date, due_date, assignee_id, author_id, created_at`;
    values.push(id);
    const res = await pool.query(q, values);
    return res.rows[0] || null;
  }

  /**
   * Soft-delete an issue by marking it inactive; if soft-delete fails, perform hard delete.
   *
   * @param {number} id - Issue ID
   * @returns {Promise<boolean>} true if deleted (soft or hard), false otherwise
   */
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
