const Issue = require('../../db/models/Issue');
const { hasPermission } = require('./permissionService');

class IssuesService {
  static async listIssues(query = {}, actor) {
    const requiredPermission = 'issues.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission issues.view'); err.statusCode = 403; throw err; }
    return await Issue.list(query);
  }

  static async getIssueById(id, actor) {
    const requiredPermission = 'issues.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission issues.view'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const i = await Issue.findById(Number(id));
    if (!i) { const err = new Error('Issue not found'); err.statusCode = 404; throw err; }
    return i;
  }

  static async createIssue(fields, actor) {
    const requiredPermission = 'issues.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission issues.create'); err.statusCode = 403; throw err; }
    if (!fields || !fields.project_id || !fields.title) { const err = new Error('Missing required fields'); err.statusCode = 400; throw err; }
    // reporter_id default to actor.id if not provided
    if (!fields.reporter_id) fields.reporter_id = actor.id;
    return await Issue.create(fields);
  }

  static async updateIssue(id, fields, actor) {
    const requiredPermission = 'issues.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission issues.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const updated = await Issue.update(Number(id), fields);
    if (!updated) { const err = new Error('Issue not found'); err.statusCode = 404; throw err; }
    return updated;
  }

  static async deleteIssue(id, actor) {
    const requiredPermission = 'issues.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission issues.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const ok = await Issue.softDelete(Number(id));
    if (!ok) { const err = new Error('Issue not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }
}

module.exports = IssuesService;
