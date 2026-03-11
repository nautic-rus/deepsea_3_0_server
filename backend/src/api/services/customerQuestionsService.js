const pool = require('../../db/connection');
const CustomerQuestion = require('../../db/models/CustomerQuestion');
const CustomerQuestionStorage = require('../../db/models/CustomerQuestionStorage');
const Storage = require('../../db/models/Storage');
const { hasPermission } = require('./permissionChecker');



class CustomerQuestionsService {
  static async listTypes(actor, projectId) {
    const requiredPermission = 'customer_questions.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission customer_questions.view'); err.statusCode = 403; throw err; }
    let res;
    if (typeof projectId !== 'undefined') {
      const q = 'SELECT * FROM customer_question_type WHERE (project_id IS NULL OR project_id = $1) ORDER BY COALESCE(order_index, 0), id';
      res = await pool.query(q, [projectId]);
    } else {
      res = await pool.query('SELECT * FROM customer_question_type ORDER BY COALESCE(order_index, 0), id');
    }
    return res.rows || [];
  }

  static async createType(fields, actor) {
    const requiredPermission = 'customer_questions.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission customer_questions.create'); err.statusCode = 403; throw err; }
    if (!fields || !fields.name || !fields.code) { const err = new Error('Missing required fields: name, code'); err.statusCode = 400; throw err; }
    const cols = ['name','code','description','color','order_index'];
    const vals = [fields.name, fields.code, fields.description || null, fields.color || null, fields.order_index || 0];
    if (fields.project_id !== undefined && fields.project_id !== null) { cols.push('project_id'); vals.push(Number(fields.project_id)); }
    const q = `INSERT INTO customer_question_type (${cols.join(',')}) VALUES (${cols.map((_,i)=>'$'+(i+1)).join(',')}) RETURNING *`;
    const res = await pool.query(q, vals);
    return res.rows[0] || null;
  }

  static async updateType(id, fields, actor) {
    const requiredPermission = 'customer_questions.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission customer_questions.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const parts = [];
    const vals = [];
    let idx = 1;
    ['name','code','description','color','order_index','project_id'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); vals.push(fields[k]); }
    });
    if (parts.length === 0) {
      const r = await pool.query('SELECT * FROM customer_question_type WHERE id = $1 LIMIT 1', [Number(id)]);
      return r.rows[0] || null;
    }
    const q = `UPDATE customer_question_type SET ${parts.join(', ')} WHERE id = $${idx} RETURNING *`;
    vals.push(Number(id));
    const res = await pool.query(q, vals);
    return res.rows[0] || null;
  }

  static async deleteType(id, actor) {
    const requiredPermission = 'customer_questions.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission customer_questions.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    // Prevent deletion if type is used in customer_questions
    const usedInQuestions = await pool.query('SELECT 1 FROM customer_questions WHERE type_id = $1 LIMIT 1', [Number(id)]);
    if (usedInQuestions.rowCount > 0) {
      const err = new Error('Cannot delete type: it is referenced by existing customer questions'); err.statusCode = 400; throw err;
    }
    const res = await pool.query('DELETE FROM customer_question_type WHERE id = $1 RETURNING id', [Number(id)]);
    return res.rowCount > 0;
  }
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
                     WHERE wf.from_status_id = $1
                       AND (wf.customer_question_type_id IS NULL OR wf.customer_question_type_id = $2)
                       AND (wf.is_active IS NULL OR wf.is_active = true)
                     ORDER BY wf.id`;
      const wfRes = await require('../../db/connection').query(wfSql, [q.status_id, q.type_id]);
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
