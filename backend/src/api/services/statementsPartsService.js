const StatementsPart = require('../../db/models/StatementsPart');
const { hasPermission } = require('./permissionChecker');

class StatementsPartsService {
  static async list(query = {}, actor) {
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, 'statements.view');
    if (!allowed) { const err = new Error('Forbidden'); err.statusCode = 403; throw err; }
    return await StatementsPart.list(query);
  }

  static async getById(id, actor) {
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, 'statements.view');
    if (!allowed) { const err = new Error('Forbidden'); err.statusCode = 403; throw err; }
    const r = await StatementsPart.findById(id);
    if (!r) { const err = new Error('Not found'); err.statusCode = 404; throw err; }
    return r;
  }

  static async create(fields, actor) {
    const allowed = await hasPermission(actor, 'statements.update');
    if (!allowed) { const err = new Error('Forbidden'); err.statusCode = 403; throw err; }
    if (!fields.statements_version_id || !fields.name) { const err = new Error('Missing fields'); err.statusCode = 400; throw err; }
    fields.created_by = actor.id;
    return await StatementsPart.create(fields);
  }

  static async update(id, fields, actor) {
    const allowed = await hasPermission(actor, 'statements.update');
    if (!allowed) { const err = new Error('Forbidden'); err.statusCode = 403; throw err; }
    const updated = await StatementsPart.update(id, fields);
    if (!updated) { const err = new Error('Not found'); err.statusCode = 404; throw err; }
    return updated;
  }

  static async delete(id, actor) {
    const allowed = await hasPermission(actor, 'statements.delete');
    if (!allowed) { const err = new Error('Forbidden'); err.statusCode = 403; throw err; }
    const ok = await StatementsPart.softDelete(id);
    if (!ok) { const err = new Error('Not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }
}

module.exports = StatementsPartsService;
