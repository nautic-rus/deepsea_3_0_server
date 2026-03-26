const StatementsVersion = require('../../db/models/StatementsVersion');
const { hasPermission } = require('./permissionChecker');

class StatementsVersionService {
  static async list(query = {}, actor) {
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, 'statements.view');
    if (!allowed) { const err = new Error('Forbidden'); err.statusCode = 403; throw err; }
    return await StatementsVersion.list(query);
  }

  static async getById(id, actor) {
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, 'statements.view');
    if (!allowed) { const err = new Error('Forbidden'); err.statusCode = 403; throw err; }
    const r = await StatementsVersion.findById(id);
    if (!r) { const err = new Error('Not found'); err.statusCode = 404; throw err; }
    return r;
  }

  static async create(fields, actor) {
    const allowed = await hasPermission(actor, 'statements.update');
    if (!allowed) { const err = new Error('Forbidden'); err.statusCode = 403; throw err; }
    if (!fields.statement_id || !fields.version) { const err = new Error('Missing fields'); err.statusCode = 400; throw err; }
    fields.created_by = actor.id;
    return await StatementsVersion.create(fields);
  }

  static async update(id, fields, actor) {
    const allowed = await hasPermission(actor, 'statements.update');
    if (!allowed) { const err = new Error('Forbidden'); err.statusCode = 403; throw err; }
    const updated = await StatementsVersion.update(id, fields);
    if (!updated) { const err = new Error('Not found'); err.statusCode = 404; throw err; }
    return updated;
  }

  static async delete(id, actor) {
    const allowed = await hasPermission(actor, 'statements.delete');
    if (!allowed) { const err = new Error('Forbidden'); err.statusCode = 403; throw err; }
    const ok = await StatementsVersion.softDelete(id);
    if (!ok) { const err = new Error('Not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }
}

module.exports = StatementsVersionService;
