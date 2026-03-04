const CustomerQuestionWorkFlow = require('../../db/models/CustomerQuestionWorkFlow');
const { hasPermission } = require('./permissionChecker');

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
    return CustomerQuestionWorkFlow.list(opts);
  }

  static async getById(id, actor) {
    const requiredPermission = 'customer_questions.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission customer_questions.view'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const row = await CustomerQuestionWorkFlow.findById(Number(id));
    if (!row) { const err = new Error('Customer question work flow not found'); err.statusCode = 404; throw err; }
    return row;
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
