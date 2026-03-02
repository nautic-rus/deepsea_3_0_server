const CustomerQuestion = require('../../db/models/CustomerQuestion');
const CustomerQuestionStorage = require('../../db/models/CustomerQuestionStorage');
const Storage = require('../../db/models/Storage');
const { hasPermission } = require('./permissionChecker');

class CustomerQuestionsService {
  static async listCustomerQuestions(query = {}, actor) {
    const requiredPermission = 'customer_questions.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission customer_questions.view'); err.statusCode = 403; throw err; }
    // Simple list: permissions already verified; project scoping removed
    return CustomerQuestion.list(query);
  }

  static async getCustomerQuestionById(id, actor) {
    const requiredPermission = 'customer_questions.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission customer_questions.view'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const q = await CustomerQuestion.findById(Number(id));
    if (!q) { const err = new Error('Customer question not found'); err.statusCode = 404; throw err; }
    // Fetch available statuses via work flow transitions from current status
    try {
      const wfSql = `SELECT cs.id, cs.name, cs.code, cs.description, wf.id AS workflow_id, wf.name AS workflow_name, wf.description AS workflow_description
                     FROM customer_question_work_flow wf
                     JOIN customer_question_status cs ON wf.to_status_id = cs.id
                     WHERE wf.from_status_id = $1 AND (wf.is_active IS NULL OR wf.is_active = true)
                     ORDER BY wf.id`;
      const wfRes = await require('../../db/connection').query(wfSql, [q.status_id]);
      q.available_statuses = wfRes.rows || [];
    } catch (e) {
      // If work flow table/columns are missing or error occurs, return question without available_statuses
      q.available_statuses = [];
    }
    return q;
  }

  static async createCustomerQuestion(fields, actor) {
    const requiredPermission = 'customer_questions.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission customer_questions.create'); err.statusCode = 403; throw err; }
    if (!fields || !fields.question_text) { const err = new Error('Missing required field: question_text'); err.statusCode = 400; throw err; }
    // default asked_by
    if (!fields.asked_by) fields.asked_by = actor.id;
    // resolve status -> status_id if provided as string/code
    if (fields.status !== undefined && fields.status !== null) {
      const s = fields.status;
      if (!Number.isNaN(Number(s))) {
        fields.status_id = Number(s);
      } else {
        // find or create status by code/name
        const res = await require('../../db/connection').query('SELECT id FROM customer_question_status WHERE code = $1 OR name = $1 LIMIT 1', [s]);
        if (res.rows[0]) fields.status_id = res.rows[0].id;
        else {
          const ins = await require('../../db/connection').query('INSERT INTO customer_question_status (name, code, created_at, updated_at) VALUES ($1,$2,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id', [s, s]);
          fields.status_id = ins.rows[0].id;
        }
      }
      delete fields.status;
    }
    const created = await CustomerQuestion.create(fields);
    return created;
  }

  static async updateCustomerQuestion(id, fields, actor) {
    const requiredPermission = 'customer_questions.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission customer_questions.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const existing = await CustomerQuestion.findById(Number(id));
    if (!existing) { const err = new Error('Customer question not found'); err.statusCode = 404; throw err; }
    // resolve status -> status_id if provided as string/code
    if (fields.status !== undefined && fields.status !== null) {
      const s = fields.status;
      if (!Number.isNaN(Number(s))) {
        fields.status_id = Number(s);
      } else {
        const res = await require('../../db/connection').query('SELECT id FROM customer_question_status WHERE code = $1 OR name = $1 LIMIT 1', [s]);
        if (res.rows[0]) fields.status_id = res.rows[0].id;
        else {
          const ins = await require('../../db/connection').query('INSERT INTO customer_question_status (name, code, created_at, updated_at) VALUES ($1,$2,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id', [s, s]);
          fields.status_id = ins.rows[0].id;
        }
      }
      delete fields.status;
    }
    const updated = await CustomerQuestion.update(Number(id), fields);
    return updated;
  }

  static async deleteCustomerQuestion(id, actor) {
    const requiredPermission = 'customer_questions.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission customer_questions.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const ok = await CustomerQuestion.softDelete(Number(id));
    if (!ok) { const err = new Error('Customer question not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }

  // File attachments
  static async attachFileToQuestion(questionId, storageId, actor) {
    const requiredPermission = 'customer_questions.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission customer_questions.update'); err.statusCode = 403; throw err; }
    if (!questionId || Number.isNaN(Number(questionId)) || !storageId) { const err = new Error('Invalid parameters'); err.statusCode = 400; throw err; }
    const attached = await CustomerQuestionStorage.attach({ customer_question_id: Number(questionId), storage_id: Number(storageId) });
    return attached;
  }

  static async detachFileFromQuestion(questionId, storageId, actor) {
    const requiredPermission = 'customer_questions.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission customer_questions.update'); err.statusCode = 403; throw err; }
    await CustomerQuestionStorage.detach({ customer_question_id: Number(questionId), storage_id: Number(storageId) });
    return { success: true };
  }

  static async listQuestionFiles(questionId, pager = { limit: 100, offset: 0 }, actor) {
    const requiredPermission = 'customer_questions.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission customer_questions.view'); err.statusCode = 403; throw err; }
    return CustomerQuestionStorage.listByQuestion(Number(questionId), pager);
  }
}

module.exports = CustomerQuestionsService;
