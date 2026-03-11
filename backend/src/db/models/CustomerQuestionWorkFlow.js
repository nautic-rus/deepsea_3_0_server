const pool = require('../connection');

class CustomerQuestionWorkFlow {
  static async list(opts = {}) {
    const { project_id, from_status_id, to_status_id, customer_question_type_id } = opts;
    const parts = [];
    const vals = [];
    let idx = 1;
    if (typeof from_status_id !== 'undefined' && from_status_id !== null) { parts.push(`wf.from_status_id = $${idx++}`); vals.push(from_status_id); }
    if (typeof to_status_id !== 'undefined' && to_status_id !== null) { parts.push(`wf.to_status_id = $${idx++}`); vals.push(to_status_id); }
    if (typeof customer_question_type_id !== 'undefined') { parts.push(`(wf.customer_question_type_id IS NULL OR wf.customer_question_type_id = $${idx++})`); vals.push(customer_question_type_id); }
    if (typeof project_id !== 'undefined') { parts.push(`(wf.project_id IS NULL OR wf.project_id = $${idx++})`); vals.push(project_id); }
    const where = parts.length ? `WHERE ${parts.join(' AND ')}` : '';
    const q = `SELECT wf.* FROM customer_question_work_flow wf ${where} ORDER BY wf.id`;
    const res = await pool.query(q, vals);
    return res.rows || [];
  }

  static async findById(id) {
    const res = await pool.query('SELECT * FROM customer_question_work_flow WHERE id = $1 LIMIT 1', [Number(id)]);
    return res.rows[0] || null;
  }

  static async create(fields) {
    const cols = ['from_status_id','to_status_id','name','description','required_permission','is_active'];
    const vals = [fields.from_status_id || null, fields.to_status_id || null, fields.name || null, fields.description || null, fields.required_permission || null, fields.is_active !== undefined ? !!fields.is_active : true];
    if (fields.customer_question_type_id !== undefined && fields.customer_question_type_id !== null) { cols.push('customer_question_type_id'); vals.push(Number(fields.customer_question_type_id)); }
    if (fields.project_id !== undefined && fields.project_id !== null) { cols.push('project_id'); vals.push(Number(fields.project_id)); }
    const q = `INSERT INTO customer_question_work_flow (${cols.join(',')}) VALUES (${cols.map((_,i)=>'$'+(i+1)).join(',')}) RETURNING *`;
    const res = await pool.query(q, vals);
    return res.rows[0] || null;
  }

  static async update(id, fields) {
    const parts = [];
    const vals = [];
    let idx = 1;
    ['from_status_id','to_status_id','name','description','required_permission','is_active','customer_question_type_id','project_id'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); vals.push(fields[k]); }
    });
    if (parts.length === 0) return await CustomerQuestionWorkFlow.findById(id);
    const q = `UPDATE customer_question_work_flow SET ${parts.join(', ')} WHERE id = $${idx} RETURNING *`;
    vals.push(Number(id));
    const res = await pool.query(q, vals);
    return res.rows[0] || null;
  }

  static async delete(id) {
    const res = await pool.query('DELETE FROM customer_question_work_flow WHERE id = $1 RETURNING id', [Number(id)]);
    return res.rowCount > 0;
  }
}

module.exports = CustomerQuestionWorkFlow;
