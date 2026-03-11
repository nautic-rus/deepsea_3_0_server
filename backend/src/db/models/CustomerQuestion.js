const pool = require('../connection');

class CustomerQuestion {
  static async list(filters = {}) {
    const { status, priority, asked_by, answered_by, page = 1, limit = 50, search, created_at_from, created_at_to, due_date_from, due_date_to } = filters;
    const offset = (page - 1) * limit;
    const where = [];
    const values = [];
    let idx = 1;
    // status filter: accept either status id (number) or status code/name (string)
    if (status !== undefined && status !== null) {
      if (!Number.isNaN(Number(status))) {
        where.push(`cq.status_id = $${idx++}`);
        values.push(Number(status));
      } else {
        where.push(`(cs.code = $${idx} OR cs.name = $${idx})`);
        values.push(status);
        idx++;
      }
    }
    if (priority !== undefined && priority !== null) { where.push(`priority = $${idx++}`); values.push(priority); }
    if (asked_by !== undefined && asked_by !== null) { where.push(`asked_by = $${idx++}`); values.push(asked_by); }
    if (answered_by !== undefined && answered_by !== null) { where.push(`answered_by = $${idx++}`); values.push(answered_by); }
    if (search) { where.push(`(question_text ILIKE $${idx} OR answer_text ILIKE $${idx})`); values.push(`%${search}%`); idx++; }
    if (created_at_from) { where.push(`cq.created_at >= $${idx++}`); values.push(created_at_from); }
    if (created_at_to) { where.push(`cq.created_at <= $${idx++}`); values.push(created_at_to); }
    
    if (due_date_from) { where.push(`due_date >= $${idx++}`); values.push(due_date_from); }
    if (due_date_to) { where.push(`due_date <= $${idx++}`); values.push(due_date_to); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const q = `SELECT cq.id, cq.question_title, cq.question_text, cq.answer_text, cq.priority,
           cq.asked_by,
           TRIM(COALESCE(ua.first_name,'') || ' ' || COALESCE(ua.last_name,'')) AS asked_by_full_name,
           ua.avatar_id AS asked_by_avatar_id,
           cq.answered_by,
           TRIM(COALESCE(ub.first_name,'') || ' ' || COALESCE(ub.last_name,'')) AS answered_by_full_name,
           ub.avatar_id AS answered_by_avatar_id,
                     cq.due_date, cq.created_at, cq.updated_at, cq.status_id,
           cs.id AS status_id, cs.name AS status_name, cs.code AS status_code, cs.description AS status_description
         FROM customer_questions cq
           LEFT JOIN customer_question_status cs ON cq.status_id = cs.id
           LEFT JOIN users ua ON cq.asked_by = ua.id
           LEFT JOIN users ub ON cq.answered_by = ub.id
           ${whereSql}
           ORDER BY cq.id DESC
           LIMIT $${idx++} OFFSET $${idx}`;
    values.push(limit, offset);
    const res = await pool.query(q, values);
    return res.rows;
  }

  static async findById(id) {
    if (!id) return null;
            const q = `SELECT cq.id, cq.question_title, cq.question_text, cq.answer_text, cq.priority,
               cq.asked_by,
               TRIM(COALESCE(ua.first_name,'') || ' ' || COALESCE(ua.last_name,'')) AS asked_by_full_name,
               ua.avatar_id AS asked_by_avatar_id,
               cq.answered_by,
               TRIM(COALESCE(ub.first_name,'') || ' ' || COALESCE(ub.last_name,'')) AS answered_by_full_name,
               ub.avatar_id AS answered_by_avatar_id,
                 cq.due_date, cq.created_at, cq.updated_at, cq.status_id,
               cs.id AS status_id, cs.name AS status_name, cs.code AS status_code, cs.description AS status_description
             FROM customer_questions cq
           LEFT JOIN customer_question_status cs ON cq.status_id = cs.id
           LEFT JOIN users ua ON cq.asked_by = ua.id
           LEFT JOIN users ub ON cq.answered_by = ub.id
           WHERE cq.id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    return res.rows[0] || null;
  }

  static async create(fields) {
    const cols = [];
    const placeholders = [];
    const vals = [];
    let idx = 1;
      ['question_title','question_text','answer_text','status_id','priority','asked_by','answered_by','due_date','type_id'].forEach((k) => {
      if (fields[k] !== undefined) {
        cols.push(k);
        placeholders.push(`$${idx++}`);
        vals.push(fields[k] === '' ? null : fields[k]);
      }
    });
    if (cols.length === 0) {
      const err = new Error('No fields provided'); err.statusCode = 400; throw err;
    }
      // Build INSERT dynamically so that DB defaults (e.g., status_id) are preserved
      const add = (col, val) => {
        cols.push(col);
        placeholders.push(`$${idx}`);
        vals.push(val);
        idx += 1;
      };

      if (fields.project_id !== undefined) add('project_id', fields.project_id);
      if (fields.author_id !== undefined) add('author_id', fields.author_id);
      if (fields.question_text !== undefined) add('question_text', fields.question_text);
      if (fields.description !== undefined) add('description', fields.description);
      if (fields.status_id !== undefined) add('status_id', fields.status_id);
      if (fields.type_id !== undefined) add('type_id', fields.type_id);

      // Always set created_at/updated_at to now() unless provided
      const colsList = cols.length ? cols.join(',') + ',created_at,updated_at' : 'created_at,updated_at';
      const placeholdersList = placeholders.length ? placeholders.join(',') + ',now(),now()' : 'now(),now()';

      const q = `INSERT INTO customer_questions (${colsList}) VALUES (${placeholdersList}) RETURNING id`;
    const res = await pool.query(q, vals);
    if (!res.rows[0]) return null;
    return await CustomerQuestion.findById(res.rows[0].id);
  }

  static async update(id, fields) {
    const parts = [];
    const values = [];
    let idx = 1;
    ['question_title','question_text','answer_text','status_id','priority','asked_by','answered_by','due_date'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); values.push(fields[k]); }
    });
    if (parts.length === 0) return await CustomerQuestion.findById(id);
    const q = `UPDATE customer_questions SET ${parts.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING id`;
    values.push(id);
    const res = await pool.query(q, values);
    if (!res.rows[0]) return null;
    return await CustomerQuestion.findById(res.rows[0].id);
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
