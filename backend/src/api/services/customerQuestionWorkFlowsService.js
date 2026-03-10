const CustomerQuestionWorkFlow = require('../../db/models/CustomerQuestionWorkFlow');
const { hasPermission } = require('./permissionChecker');
const pool = require('../../db/connection');

class CustomerQuestionWorkFlowsService {
  static async list(query, actor) {
    const requiredPermission = 'customer_questions.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission customer_questions.view'); err.statusCode = 403; throw err; }
    const opts = {};
    if (query.project_id !== undefined) opts.project_id = Number(query.project_id);
    if (query.from_status_id !== undefined) opts.from_status_id = Number(query.from_status_id);
    if (query.to_status_id !== undefined) opts.to_status_id = Number(query.to_status_id);
    const rows = await CustomerQuestionWorkFlow.list(opts);
    if (!rows || rows.length === 0) return rows;

    const fromStatusIds = new Set();
    const toStatusIds = new Set();
    const projectIds = new Set();
    for (const r of rows) {
      if (r.from_status_id) fromStatusIds.add(r.from_status_id);
      if (r.to_status_id) toStatusIds.add(r.to_status_id);
      if (r.project_id) projectIds.add(r.project_id);
    }

    const queries = [];
    queries.push(fromStatusIds.size ? pool.query('SELECT * FROM customer_question_status WHERE id = ANY($1::int[])', [[...fromStatusIds]]) : Promise.resolve({ rows: [] }));
    queries.push(toStatusIds.size ? pool.query('SELECT * FROM customer_question_status WHERE id = ANY($1::int[])', [[...toStatusIds]]) : Promise.resolve({ rows: [] }));
    queries.push(projectIds.size ? pool.query('SELECT id, name, code FROM projects WHERE id = ANY($1::int[])', [[...projectIds]]) : Promise.resolve({ rows: [] }));

    const [fromRes, toRes, projectsRes] = await Promise.all(queries);
    const fromMap = new Map((fromRes.rows || []).map(r => [r.id, r]));
    const toMap = new Map((toRes.rows || []).map(r => [r.id, r]));
    const projectMap = new Map((projectsRes.rows || []).map(r => [r.id, r]));

    return rows.map(r => Object.assign({}, r, {
      from_status: r.from_status_id ? fromMap.get(r.from_status_id) || null : null,
      to_status: r.to_status_id ? toMap.get(r.to_status_id) || null : null,
      project: r.project_id ? projectMap.get(r.project_id) || null : null
    }));
  }

  static async getById(id, actor) {
    const requiredPermission = 'customer_questions.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission customer_questions.view'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const row = await CustomerQuestionWorkFlow.findById(Number(id));
    if (!row) { const err = new Error('Customer question work flow not found'); err.statusCode = 404; throw err; }

    const qFrom = row.from_status_id ? pool.query('SELECT * FROM customer_question_status WHERE id = $1 LIMIT 1', [row.from_status_id]) : Promise.resolve({ rows: [] });
    const qTo = row.to_status_id ? pool.query('SELECT * FROM customer_question_status WHERE id = $1 LIMIT 1', [row.to_status_id]) : Promise.resolve({ rows: [] });
    const qProj = row.project_id ? pool.query('SELECT id, name, code FROM projects WHERE id = $1 LIMIT 1', [row.project_id]) : Promise.resolve({ rows: [] });

    const [fromRes, toRes, projRes] = await Promise.all([qFrom, qTo, qProj]);
    return Object.assign({}, row, {
      from_status: fromRes.rows[0] || null,
      to_status: toRes.rows[0] || null,
      project: projRes.rows[0] || null
    });
  }

  static async create(fields, actor) {
    const requiredPermission = 'customer_questions.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission customer_questions.create'); err.statusCode = 403; throw err; }
    if (!fields.from_status_id) { const err = new Error('from_status_id required'); err.statusCode = 400; throw err; }
    if (!fields.to_status_id) { const err = new Error('to_status_id required'); err.statusCode = 400; throw err; }
    return CustomerQuestionWorkFlow.create(fields);
  }

  static async update(id, fields, actor) {
    const requiredPermission = 'customer_questions.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission customer_questions.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const updated = await CustomerQuestionWorkFlow.update(Number(id), fields);
    if (!updated) { const err = new Error('Customer question work flow not found'); err.statusCode = 404; throw err; }
    return updated;
  }

  static async delete(id, actor) {
    const requiredPermission = 'customer_questions.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission customer_questions.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const ok = await CustomerQuestionWorkFlow.delete(Number(id));
    if (!ok) { const err = new Error('Customer question work flow not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }
}

module.exports = CustomerQuestionWorkFlowsService;
