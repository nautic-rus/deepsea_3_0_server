const Statement = require('../../db/models/Statement');
const { hasPermission } = require('./permissionChecker');

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
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission statements.view'); err.statusCode = 403; throw err; }
    return await Statement.list(query);
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
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission statements.create'); err.statusCode = 403; throw err; }
    if (!fields || !fields.document_id || !fields.name) { const err = new Error('Missing required fields'); err.statusCode = 400; throw err; }
    if (!fields.created_by) fields.created_by = actor.id;
    return await Statement.create(fields);
  }

  static async updateStatement(id, fields, actor) {
    const requiredPermission = 'statements.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission statements.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const updated = await Statement.update(Number(id), fields);
    if (!updated) { const err = new Error('Statement not found'); err.statusCode = 404; throw err; }
    return updated;
  }

  static async deleteStatement(id, actor) {
    const requiredPermission = 'statements.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission statements.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const ok = await Statement.softDelete(Number(id));
    if (!ok) { const err = new Error('Statement not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }
}

module.exports = StatementsService;
