const IssueWorkFlow = require('../../db/models/IssueWorkFlow');
const { hasPermission, hasPermissionForProject } = require('./permissionChecker');
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
    if (query.from_status_id !== undefined) opts.from_status_id = Number(query.from_status_id);
    if (query.to_status_id !== undefined) opts.to_status_id = Number(query.to_status_id);
    let rows = await IssueWorkFlow.list(opts);
    if (!rows || rows.length === 0) return rows;

    // Filter by required_permission: keep rows without required_permission,
    // remove rows where user lacks the required permission for the workflow's project
    const permCodes = [...new Set(rows.filter(r => r.required_permission).map(r => r.required_permission))];
    if (permCodes.length > 0) {
      const userPermsRes = await pool.query(`
        SELECT DISTINCT p.code, ur.project_id
        FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = $1 AND p.code = ANY($2::text[])
      `, [actor.id, permCodes]);
      const userPerms = userPermsRes.rows;
      rows = rows.filter(r => {
        if (!r.required_permission) return true;
        return userPerms.some(up => up.code === r.required_permission && (up.project_id === null || up.project_id === r.project_id));
      });
    }
    if (rows.length === 0) return rows;

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

    return rows.map(r => {
      const out = Object.assign({}, r);
      delete out.issue_type_id;
      out.from_status = r.from_status_id ? fromMap.get(r.from_status_id) || null : null;
      out.to_status = r.to_status_id ? toMap.get(r.to_status_id) || null : null;
      out.issue_type = r.issue_type_id ? typeMap.get(r.issue_type_id) || null : null;
      out.project = r.project_id ? projectMap.get(r.project_id) || null : null;
      return out;
    });
  }

  static async getById(id, actor) {
    const requiredPermission = 'issues.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission issues.view'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const row = await IssueWorkFlow.findById(Number(id));
    if (!row) { const err = new Error('Issue work flow not found'); err.statusCode = 404; throw err; }

    // Check required_permission for this workflow
    if (row.required_permission) {
      const hasPerm = await hasPermissionForProject(actor, row.required_permission, row.project_id);
      if (!hasPerm) { const err = new Error('Forbidden: missing required workflow permission'); err.statusCode = 403; throw err; }
    }

    const qFrom = row.from_status_id ? pool.query('SELECT * FROM issue_status WHERE id = $1 LIMIT 1', [row.from_status_id]) : Promise.resolve({ rows: [] });
    const qTo = row.to_status_id ? pool.query('SELECT * FROM issue_status WHERE id = $1 LIMIT 1', [row.to_status_id]) : Promise.resolve({ rows: [] });
    const qType = row.issue_type_id ? pool.query('SELECT * FROM issue_type WHERE id = $1 LIMIT 1', [row.issue_type_id]) : Promise.resolve({ rows: [] });
    const qProj = row.project_id ? pool.query('SELECT id, name, code FROM projects WHERE id = $1 LIMIT 1', [row.project_id]) : Promise.resolve({ rows: [] });

    const [fromRes, toRes, typeRes, projRes] = await Promise.all([qFrom, qTo, qType, qProj]);
    const out = Object.assign({}, row);
    delete out.issue_type_id;
    out.from_status = fromRes.rows[0] || null;
    out.to_status = toRes.rows[0] || null;
    out.issue_type = typeRes.rows[0] || null;
    out.project = projRes.rows[0] || null;
    return out;
  }

  static async create(fields, actor) {
    const requiredPermission = 'issues.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission issues.create'); err.statusCode = 403; throw err; }
    if (!fields.from_status_id) { const err = new Error('from_status_id required'); err.statusCode = 400; throw err; }
    if (!fields.to_status_id) { const err = new Error('to_status_id required'); err.statusCode = 400; throw err; }
    return IssueWorkFlow.create(fields);
  }

  static async update(id, fields, actor) {
    const requiredPermission = 'issues.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission issues.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const updated = await IssueWorkFlow.update(Number(id), fields);
    if (!updated) { const err = new Error('Issue work flow not found'); err.statusCode = 404; throw err; }
    return updated;
  }

  static async delete(id, actor) {
    const requiredPermission = 'issues.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission issues.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const ok = await IssueWorkFlow.delete(Number(id));
    if (!ok) { const err = new Error('Issue work flow not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }
}

module.exports = IssueWorkFlowsService;
