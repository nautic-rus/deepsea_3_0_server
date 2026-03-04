const CustomerQuestionStatus = require('../../db/models/CustomerQuestionStatus');
const { hasPermission } = require('./permissionChecker');

class CustomerQuestionStatusesService {
  static async list(actor) {
    const requiredPermission = 'customer_questions.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission customer_questions.view'); err.statusCode = 403; throw err; }
    return CustomerQuestionStatus.list();
  }

  static async getById(id, actor) {
    const requiredPermission = 'customer_questions.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission customer_questions.view'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const row = await CustomerQuestionStatus.findById(Number(id));
    if (!row) { const err = new Error('Customer question status not found'); err.statusCode = 404; throw err; }
    return row;
  }

  static async create(fields, actor) {
    const requiredPermission = 'customer_questions.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission customer_questions.create'); err.statusCode = 403; throw err; }
    if (!fields.name || !String(fields.name).trim()) { const err = new Error('Name required'); err.statusCode = 400; throw err; }
    if (!fields.code || !String(fields.code).trim()) { const err = new Error('Code required'); err.statusCode = 400; throw err; }
    return CustomerQuestionStatus.create(fields);
  }

  static async update(id, fields, actor) {
    const requiredPermission = 'customer_questions.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission customer_questions.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const updated = await CustomerQuestionStatus.update(Number(id), fields);
    if (!updated) { const err = new Error('Customer question status not found'); err.statusCode = 404; throw err; }
    return updated;
  }

  static async delete(id, actor) {
    const requiredPermission = 'customer_questions.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission customer_questions.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const ok = await CustomerQuestionStatus.delete(Number(id));
    if (!ok) { const err = new Error('Customer question status not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }
}

module.exports = CustomerQuestionStatusesService;
