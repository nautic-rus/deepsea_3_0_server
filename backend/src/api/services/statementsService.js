const Statement = require('../../db/models/Statement');
const { hasPermission, hasPermissionForProject, getPermissionProjectScope } = require('./permissionChecker');

/**
 * StatementsService
 *
 * Handles statement CRUD and permission checks, delegating persistence to
 * the Statement model.
 */
class StatementsService {
  static async listStatements(query = {}, actor) {
    const requiredPermission = 'statements.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const permissionScope = await getPermissionProjectScope(actor, requiredPermission);
    if (!permissionScope.hasGlobal && permissionScope.projectIds.length === 0) {
      const err = new Error('Forbidden: missing permission statements.view'); err.statusCode = 403; throw err;
    }

    if (permissionScope.hasGlobal) {
      return await Statement.list(query);
    }

    const allowedProjectIds = permissionScope.projectIds;
    if (query.project_id !== undefined && query.project_id !== null) {
      const requestedProjectIds = Array.isArray(query.project_id)
        ? query.project_id.map(p => Number(p)).filter(p => !Number.isNaN(p))
        : [Number(query.project_id)].filter(p => !Number.isNaN(p));

      if (requestedProjectIds.length === 0) {
        const err = new Error('Invalid project_id'); err.statusCode = 400; throw err;
      }

      const forbiddenProject = requestedProjectIds.find(pid => !allowedProjectIds.includes(pid));
      if (forbiddenProject !== undefined) {
        const err = new Error('Forbidden: missing permission statements.view for requested project'); err.statusCode = 403; throw err;
      }

      query.project_id = requestedProjectIds.length === 1 ? requestedProjectIds[0] : requestedProjectIds;
    }

    const filters = Object.assign({}, query, { allowed_project_ids: allowedProjectIds });
    return await Statement.list(filters);
  }

  static async getStatementById(id, actor) {
    const requiredPermission = 'statements.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission statements.view'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const s = await Statement.findById(Number(id));
    if (!s) { const err = new Error('Statement not found'); err.statusCode = 404; throw err; }
    return s;
  }

  static async createStatement(fields, actor) {
    const requiredPermission = 'statements.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    if (!fields || !fields.name) { const err = new Error('Missing required fields'); err.statusCode = 400; throw err; }
    const targetProjectId = fields.project_id !== undefined && fields.project_id !== null ? Number(fields.project_id) : null;
    const allowed = targetProjectId
      ? await hasPermissionForProject(actor, requiredPermission, targetProjectId)
      : await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission statements.create for target project'); err.statusCode = 403; throw err; }
    if (!fields.created_by) fields.created_by = actor.id;
    return await Statement.create(fields);
  }

  static async updateStatement(id, fields, actor) {
    const requiredPermission = 'statements.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const existing = await Statement.findById(Number(id));
    if (!existing) { const err = new Error('Statement not found'); err.statusCode = 404; throw err; }
    const allowedCurrent = existing.project_id
      ? await hasPermissionForProject(actor, requiredPermission, existing.project_id)
      : await hasPermission(actor, requiredPermission);
    if (!allowedCurrent) { const err = new Error('Forbidden: missing permission statements.update for this project'); err.statusCode = 403; throw err; }
    if (fields.project_id !== undefined && fields.project_id !== null && Number(fields.project_id) !== Number(existing.project_id)) {
      const allowedTarget = await hasPermissionForProject(actor, requiredPermission, Number(fields.project_id));
      if (!allowedTarget) { const err = new Error('Forbidden: missing permission statements.update for target project'); err.statusCode = 403; throw err; }
    }
    const updated = await Statement.update(Number(id), fields);
    if (!updated) { const err = new Error('Statement not found'); err.statusCode = 404; throw err; }
    return updated;
  }

  static async deleteStatement(id, actor) {
    const requiredPermission = 'statements.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const existing = await Statement.findById(Number(id));
    if (!existing) { const err = new Error('Statement not found'); err.statusCode = 404; throw err; }
    const allowed = existing.project_id
      ? await hasPermissionForProject(actor, requiredPermission, existing.project_id)
      : await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission statements.delete for this project'); err.statusCode = 403; throw err; }
    const ok = await Statement.softDelete(Number(id));
    if (!ok) { const err = new Error('Statement not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }
}

module.exports = StatementsService;
