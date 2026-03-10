const IssueWorkFlow = require('../../db/models/IssueWorkFlow');
const { hasPermission } = require('./permissionChecker');
const pool = require('../../db/connection');

class IssueWorkFlowsService {
  static async list(query, actor) {
    const requiredPermission = 'issues.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission issues.view'); err.statusCode = 403; throw err; }
    const opts = {};
    if (query.project_id !== undefined) opts.project_id = Number(query.project_id);
    if (query.issue_type_id !== undefined) opts.issue_type_id = Number(query.issue_type_id);
    const rows = await IssueWorkFlow.list(opts);
    if (!rows || rows.length === 0) return rows;

    const fromStatusIds = new Set();
    const toStatusIds = new Set();
    const typeIds = new Set();
    const projectIds = new Set();
    for (const r of rows) {
      if (r.from_status_id) fromStatusIds.add(r.from_status_id);
      if (r.to_status_id) toStatusIds.add(r.to_status_id);
      if (r.issue_type_id) typeIds.add(r.issue_type_id);
      if (r.project_id) projectIds.add(r.project_id);
    }

    const queries = [];
    queries.push(fromStatusIds.size ? pool.query('SELECT * FROM issue_status WHERE id = ANY($1::int[])', [[...fromStatusIds]]) : Promise.resolve({ rows: [] }));
    queries.push(toStatusIds.size ? pool.query('SELECT * FROM issue_status WHERE id = ANY($1::int[])', [[...toStatusIds]]) : Promise.resolve({ rows: [] }));
    queries.push(typeIds.size ? pool.query('SELECT * FROM issue_type WHERE id = ANY($1::int[])', [[...typeIds]]) : Promise.resolve({ rows: [] }));
    queries.push(projectIds.size ? pool.query('SELECT id, name, code FROM projects WHERE id = ANY($1::int[])', [[...projectIds]]) : Promise.resolve({ rows: [] }));

    const [fromRes, toRes, typesRes, projectsRes] = await Promise.all(queries);
    const fromMap = new Map((fromRes.rows || []).map(r => [r.id, r]));
    const toMap = new Map((toRes.rows || []).map(r => [r.id, r]));
    const typeMap = new Map((typesRes.rows || []).map(r => [r.id, r]));
    const projectMap = new Map((projectsRes.rows || []).map(r => [r.id, r]));

    return rows.map(r => Object.assign({}, r, {
      from_status: r.from_status_id ? fromMap.get(r.from_status_id) || null : null,
      to_status: r.to_status_id ? toMap.get(r.to_status_id) || null : null,
      issue_type: r.issue_type_id ? typeMap.get(r.issue_type_id) || null : null,
      project: r.project_id ? projectMap.get(r.project_id) || null : null
    }));
  }

  static async getById(id, actor) {
    const requiredPermission = 'issues.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission issues.view'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const row = await IssueWorkFlow.findById(Number(id));
    if (!row) { const err = new Error('Issue work flow not found'); err.statusCode = 404; throw err; }

    const qFrom = row.from_status_id ? pool.query('SELECT * FROM issue_status WHERE id = $1 LIMIT 1', [row.from_status_id]) : Promise.resolve({ rows: [] });
    const qTo = row.to_status_id ? pool.query('SELECT * FROM issue_status WHERE id = $1 LIMIT 1', [row.to_status_id]) : Promise.resolve({ rows: [] });
    const qType = row.issue_type_id ? pool.query('SELECT * FROM issue_type WHERE id = $1 LIMIT 1', [row.issue_type_id]) : Promise.resolve({ rows: [] });
    const qProj = row.project_id ? pool.query('SELECT id, name, code FROM projects WHERE id = $1 LIMIT 1', [row.project_id]) : Promise.resolve({ rows: [] });

    const [fromRes, toRes, typeRes, projRes] = await Promise.all([qFrom, qTo, qType, qProj]);
    return Object.assign({}, row, {
      from_status: fromRes.rows[0] || null,
      to_status: toRes.rows[0] || null,
      issue_type: typeRes.rows[0] || null,
      project: projRes.rows[0] || null
    });
  }
}

module.exports = IssueWorkFlowsService;
