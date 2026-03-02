const pool = require('../connection');

class CustomerQuestion {
  static async list(filters = {}) {
    const { document_id, project_id, status, priority, asked_by, answered_by, page = 1, limit = 50, search, asked_at_from, asked_at_to, answered_at_from, answered_at_to, due_date_from, due_date_to, allowed_project_ids } = filters;
    const offset = (page - 1) * limit;
    const where = [];
    const values = [];
    let idx = 1;
    if (document_id !== undefined && document_id !== null) { where.push(`document_id = $${idx++}`); values.push(document_id); }
    if (project_id !== undefined && project_id !== null) { where.push(`project_id = $${idx++}`); values.push(project_id); }
    if (status !== undefined && status !== null) { where.push(`status = $${idx++}`); values.push(status); }
    if (priority !== undefined && priority !== null) { where.push(`priority = $${idx++}`); values.push(priority); }
    if (asked_by !== undefined && asked_by !== null) { where.push(`asked_by = $${idx++}`); values.push(asked_by); }
    if (answered_by !== undefined && answered_by !== null) { where.push(`answered_by = $${idx++}`); values.push(answered_by); }
    if (search) { where.push(`(question_text ILIKE $${idx} OR answer_text ILIKE $${idx})`); values.push(`%${search}%`); idx++; }
    if (asked_at_from) { where.push(`asked_at >= $${idx++}`); values.push(asked_at_from); }
    if (asked_at_to) { where.push(`asked_at <= $${idx++}`); values.push(asked_at_to); }
    if (answered_at_from) { where.push(`answered_at >= $${idx++}`); values.push(answered_at_from); }
    if (answered_at_to) { where.push(`answered_at <= $${idx++}`); values.push(answered_at_to); }
    if (due_date_from) { where.push(`due_date >= $${idx++}`); values.push(due_date_from); }
    if (due_date_to) { where.push(`due_date <= $${idx++}`); values.push(due_date_to); }
    if (allowed_project_ids && Array.isArray(allowed_project_ids) && allowed_project_ids.length > 0) { where.push(`project_id = ANY($${idx}::int[])`); values.push(allowed_project_ids); idx++; }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const q = `SELECT id, document_id, project_id, question_text, answer_text, status, priority, asked_by, answered_by, asked_at, answered_at, due_date, created_at, updated_at FROM customer_questions ${whereSql} ORDER BY id DESC LIMIT $${idx++} OFFSET $${idx}`;
    values.push(limit, offset);
    const res = await pool.query(q, values);
    return res.rows;
  }

  static async findById(id) {
    if (!id) return null;
    const q = `SELECT id, document_id, project_id, question_text, answer_text, status, priority, asked_by, answered_by, asked_at, answered_at, due_date, created_at, updated_at FROM customer_questions WHERE id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    return res.rows[0] || null;
  }

  static async create(fields) {
    const q = `INSERT INTO customer_questions (document_id, project_id, question_text, answer_text, status, priority, asked_by, answered_by, asked_at, answered_at, due_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id, document_id, project_id, question_text, answer_text, status, priority, asked_by, answered_by, asked_at, answered_at, due_date, created_at, updated_at`;
    const vals = [fields.document_id, fields.project_id || null, fields.question_text, fields.answer_text || null, fields.status || null, fields.priority || null, fields.asked_by || null, fields.answered_by || null, fields.asked_at || null, fields.answered_at || null, fields.due_date || null];
    const res = await pool.query(q, vals);
    return res.rows[0];
  }

  static async update(id, fields) {
    const parts = [];
    const values = [];
    let idx = 1;
    ['document_id','project_id','question_text','answer_text','status','priority','asked_by','answered_by','asked_at','answered_at','due_date'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); values.push(fields[k]); }
    });
    if (parts.length === 0) return await CustomerQuestion.findById(id);
    const q = `UPDATE customer_questions SET ${parts.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING id, document_id, project_id, question_text, answer_text, status, priority, asked_by, answered_by, asked_at, answered_at, due_date, created_at, updated_at`;
    values.push(id);
    const res = await pool.query(q, values);
    return res.rows[0] || null;
  }

  static async softDelete(id) {
    try {
      const res = await pool.query("UPDATE customer_questions SET updated_at = CURRENT_TIMESTAMP WHERE id = $1", [id]);
      if (res.rowCount > 0) return true;
    } catch (e) {}
    const del = await pool.query('DELETE FROM customer_questions WHERE id = $1', [id]);
    return del.rowCount > 0;
  }
}

module.exports = CustomerQuestion;
