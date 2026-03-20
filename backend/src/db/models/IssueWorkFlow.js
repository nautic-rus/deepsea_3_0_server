const pool = require('../connection');

class IssueWorkFlow {
  static async list(opts = {}) {
    const { project_id, issue_type_id } = opts;
    const parts = [];
    const vals = [];
    let idx = 1;
    if (typeof issue_type_id !== 'undefined' && issue_type_id !== null) {
      parts.push(`wf.issue_type_id = $${idx++}`);
      vals.push(issue_type_id);
    }
    if (typeof project_id !== 'undefined') {
      parts.push(`(wf.project_id IS NULL OR wf.project_id = $${idx++})`);
      vals.push(project_id);
    }
    const where = parts.length ? `WHERE ${parts.join(' AND ')}` : '';
    const q = `SELECT wf.* FROM issue_work_flow wf ${where} ORDER BY wf.issue_type_id NULLS FIRST, wf.from_status_id, wf.to_status_id`;
    const res = await pool.query(q, vals);
    return res.rows || [];
  }

  static async findById(id) {
    const res = await pool.query('SELECT * FROM issue_work_flow WHERE id = $1 LIMIT 1', [Number(id)]);
    return res.rows[0] || null;
  }

  static async create(fields) {
    const cols = ['issue_type_id','from_status_id','to_status_id'];
    const vals = [fields.issue_type_id || null, fields.from_status_id || null, fields.to_status_id || null];
    if (fields.name !== undefined) { cols.push('name'); vals.push(fields.name || null); }
    if (fields.description !== undefined) { cols.push('description'); vals.push(fields.description || null); }
    if (fields.required_permission !== undefined) { cols.push('required_permission'); vals.push(fields.required_permission || null); }
    if (fields.is_active !== undefined && fields.is_active !== null) { cols.push('is_active'); vals.push(!!fields.is_active); }
    if (fields.project_id !== undefined && fields.project_id !== null) { cols.push('project_id'); vals.push(Number(fields.project_id)); }
    const q = `INSERT INTO issue_work_flow (${cols.join(',')}) VALUES (${cols.map((_,i)=>'$'+(i+1)).join(',')}) RETURNING *`;
    const res = await pool.query(q, vals);
    return res.rows[0] || null;
  }

  static async update(id, fields) {
    const parts = [];
    const vals = [];
    let idx = 1;
    ['issue_type_id','from_status_id','to_status_id','is_active','project_id','name','description','required_permission'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); vals.push(fields[k]); }
    });
    if (parts.length === 0) return await IssueWorkFlow.findById(id);
    const q = `UPDATE issue_work_flow SET ${parts.join(', ')} WHERE id = $${idx} RETURNING *`;
    vals.push(Number(id));
    const res = await pool.query(q, vals);
    return res.rows[0] || null;
  }

  static async delete(id) {
    const res = await pool.query('DELETE FROM issue_work_flow WHERE id = $1 RETURNING id', [Number(id)]);
    return res.rowCount > 0;
  }
}

module.exports = IssueWorkFlow;
