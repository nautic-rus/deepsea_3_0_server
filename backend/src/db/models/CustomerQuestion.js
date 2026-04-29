const pool = require('../connection');

class CustomerQuestion {
  static async list(filters = {}) {
    const { status, priority, asked_by, answered_by, my_question_user_id, is_closed, is_active, page = 1, limit, search, created_at_from, created_at_to, due_date_from, due_date_to, project_id } = filters;
    const offset = limit ? (page - 1) * limit : 0;
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
    // my_question_user_id: user is either asked_by or answered_by
    if (my_question_user_id !== undefined && my_question_user_id !== null) {
      where.push(`(asked_by = $${idx} OR answered_by = $${idx})`);
      values.push(my_question_user_id);
      idx++;
    }
    // is_closed: map to customer_question_status.is_final boolean flag
    if (is_closed !== undefined && is_closed !== null) {
      where.push(`status_id IN (SELECT id FROM customer_question_status WHERE is_final = $${idx++})`);
      values.push(is_closed);
    }
    if (project_id !== undefined && project_id !== null) {
      const projectIds = Array.isArray(project_id)
        ? project_id.map(p => Number(p)).filter(p => !Number.isNaN(p))
        : [Number(project_id)].filter(p => !Number.isNaN(p));

      if (projectIds.length === 0) {
        return [];
      }

      if (projectIds.length === 1) {
        where.push(`cq.project_id = $${idx++}`);
        values.push(projectIds[0]);
      } else {
        where.push(`cq.project_id = ANY($${idx}::int[])`);
        values.push(projectIds);
        idx++;
      }
    }
    // allowed_project_ids: only include questions that belong to these projects
    if (filters.allowed_project_ids !== undefined && filters.allowed_project_ids !== null) {
      const arr = Array.isArray(filters.allowed_project_ids) ? filters.allowed_project_ids.map(p => Number(p)).filter(p => !Number.isNaN(p)) : [Number(filters.allowed_project_ids)].filter(p => !Number.isNaN(p));
      if (arr.length === 0) return [];
      where.push(`cq.project_id = ANY($${idx}::int[])`);
      values.push(arr);
      idx++;
    }
    if (search) { where.push(`(question_text ILIKE $${idx} OR answer_text ILIKE $${idx})`); values.push(`%${search}%`); idx++; }
    if (created_at_from) { where.push(`cq.created_at >= $${idx++}`); values.push(created_at_from); }
    if (created_at_to) { where.push(`cq.created_at <= $${idx++}`); values.push(created_at_to); }
    
    if (due_date_from) { where.push(`due_date >= $${idx++}`); values.push(due_date_from); }
    if (due_date_to) { where.push(`due_date <= $${idx++}`); values.push(due_date_to); }
    // By default only return active customer questions unless caller explicitly passes is_active
    if (typeof is_active === 'undefined') {
      where.push(`cq.is_active = true`);
    } else if (is_active !== undefined) {
      where.push(`cq.is_active = $${idx++}`); values.push(is_active);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
        let q = `SELECT cq.id, cq.project_id, cq.question_title, cq.question_text, cq.answer_text, cq.priority,
           cq.asked_by,
           TRIM(COALESCE(ua.first_name,'') || ' ' || COALESCE(ua.last_name,'')) AS asked_by_full_name,
           ua.avatar_id AS asked_by_avatar_id,
           cq.answered_by,
           TRIM(COALESCE(ub.first_name,'') || ' ' || COALESCE(ub.last_name,'')) AS answered_by_full_name,
           ub.avatar_id AS answered_by_avatar_id,
           cq.due_date, cq.created_at, cq.updated_at,
           cq.status_id, cs.name AS status_name, cs.code AS status_code, cs.description AS status_description,
           cq.type_id, ct.name AS type_name,
           cq.specialization_id, sp.name AS specialization_name,
           p.code AS project_code, p.name AS project_name
          FROM customer_questions cq
            LEFT JOIN customer_question_status cs ON cq.status_id = cs.id
            LEFT JOIN customer_question_type ct ON cq.type_id = ct.id
            LEFT JOIN specializations sp ON cq.specialization_id = sp.id
            LEFT JOIN projects p ON cq.project_id = p.id
            LEFT JOIN users ua ON cq.asked_by = ua.id
            LEFT JOIN users ub ON cq.answered_by = ub.id
           ${whereSql}
           ORDER BY cq.id DESC`;
    if (limit != null) {
      q += ` LIMIT $${idx++} OFFSET $${idx}`;
      values.push(limit, offset);
    } else if (offset) {
      q += ` OFFSET $${idx}`;
      values.push(offset);
    }
    const res = await pool.query(q, values);
    const rows = res.rows || [];
    return rows.map(r => ({
      id: r.id,
      question_title: r.question_title,
      question_text: r.question_text,
      answer_text: r.answer_text,
      priority: r.priority,
      due_date: r.due_date,
      created_at: r.created_at,
      updated_at: r.updated_at,
      project: r.project_id ? { id: r.project_id, code: r.project_code, name: r.project_name } : null,
      type: r.type_id ? { id: r.type_id, name: r.type_name } : null,
      specialization: r.specialization_id ? { id: r.specialization_id, name: r.specialization_name } : null,
      status: r.status_id ? { id: r.status_id, name: r.status_name, code: r.status_code, description: r.status_description } : null,
      asked_by: r.asked_by ? { id: r.asked_by, full_name: r.asked_by_full_name, avatar_id: r.asked_by_avatar_id } : null,
      answered_by: r.answered_by ? { id: r.answered_by, full_name: r.answered_by_full_name, avatar_id: r.answered_by_avatar_id } : null,
    }));
  }

  static async findById(id) {
    if (!id) return null;
            const q = `SELECT cq.id, cq.question_title, cq.question_text, cq.answer_text, cq.priority,
               cq.project_id,
               cq.asked_by,
               TRIM(COALESCE(ua.first_name,'') || ' ' || COALESCE(ua.last_name,'')) AS asked_by_full_name,
               ua.avatar_id AS asked_by_avatar_id,
               cq.answered_by,
               TRIM(COALESCE(ub.first_name,'') || ' ' || COALESCE(ub.last_name,'')) AS answered_by_full_name,
               ub.avatar_id AS answered_by_avatar_id,
                  cq.due_date, cq.created_at, cq.updated_at,
                       cq.status_id, cs.name AS status_name, cs.code AS status_code, cs.description AS status_description,
                       cq.type_id, ct.name AS type_name,
                       cq.specialization_id, sp.name AS specialization_name,
                       p.code AS project_code, p.name AS project_name
                   FROM customer_questions cq
                 LEFT JOIN customer_question_status cs ON cq.status_id = cs.id
                 LEFT JOIN customer_question_type ct ON cq.type_id = ct.id
                 LEFT JOIN specializations sp ON cq.specialization_id = sp.id
                 LEFT JOIN projects p ON cq.project_id = p.id
                 LEFT JOIN users ua ON cq.asked_by = ua.id
                 LEFT JOIN users ub ON cq.answered_by = ub.id
                 WHERE cq.id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    const r = res.rows[0];
    if (!r) return null;
    return {
      id: r.id,
      question_title: r.question_title,
      question_text: r.question_text,
      answer_text: r.answer_text,
      priority: r.priority,
      due_date: r.due_date,
      created_at: r.created_at,
      updated_at: r.updated_at,
      project: r.project_id ? { id: r.project_id, code: r.project_code, name: r.project_name } : null,
      type: r.type_id ? { id: r.type_id, name: r.type_name } : null,
      specialization: r.specialization_id ? { id: r.specialization_id, name: r.specialization_name } : null,
      status: r.status_id ? { id: r.status_id, name: r.status_name, code: r.status_code, description: r.status_description } : null,
      asked_by: r.asked_by ? { id: r.asked_by, full_name: r.asked_by_full_name, avatar_id: r.asked_by_avatar_id } : null,
      answered_by: r.answered_by ? { id: r.answered_by, full_name: r.answered_by_full_name, avatar_id: r.answered_by_avatar_id } : null,
    };
  }

  static async create(fields) {
    const cols = [];
    const placeholders = [];
    const vals = [];
    let idx = 1;
      ['question_title','question_text','answer_text','status_id','priority','asked_by','answered_by','due_date','type_id','project_id','author_id','description','specialization_id'].forEach((k) => {
      if (fields[k] !== undefined) {
        cols.push(k);
        placeholders.push(`$${idx++}`);
        vals.push(fields[k] === '' ? null : fields[k]);
      }
    });
    if (cols.length === 0) {
      const err = new Error('No fields provided'); err.statusCode = 400; throw err;
    }

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
    ['question_title','question_text','answer_text','status_id','priority','asked_by','answered_by','due_date','type_id','project_id','specialization_id'].forEach((k) => {
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
      const q = `UPDATE customer_questions SET is_active = false WHERE id = $1`;
      const res = await pool.query(q, [id]);
      if (res.rowCount > 0) return true;
    } catch (err) {}
    const q2 = `DELETE FROM customer_questions WHERE id = $1`;
    const res2 = await pool.query(q2, [id]);
    return res2.rowCount > 0;
  }
}

module.exports = CustomerQuestion;
