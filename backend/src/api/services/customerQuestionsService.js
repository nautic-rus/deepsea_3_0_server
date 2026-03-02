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

    // If actor has view_all allow unrestricted
    const canViewAll = await hasPermission(actor, 'customer_questions.view_all');
    if (canViewAll) {
      return CustomerQuestion.list(query);
    }

    // enforce assignment to project if project_id provided or restrict to user's projects
    const Project = require('../../db/models/Project');
    const projectIds = await Project.listAssignedProjectIds(actor.id);
    if (query.project_id !== undefined && query.project_id !== null) {
      const requested = Array.isArray(query.project_id) ? query.project_id.map(Number).filter(p => !Number.isNaN(p)) : [Number(query.project_id)].filter(p => !Number.isNaN(p));
      if (requested.length === 0) { const err = new Error('Invalid project_id'); err.statusCode = 400; throw err; }
      const notAssigned = requested.find(pid => !projectIds.includes(pid));
      if (notAssigned !== undefined) { const err = new Error('Forbidden: user is not assigned to the requested project'); err.statusCode = 403; throw err; }
      query.project_id = requested.length === 1 ? requested[0] : requested;
      return CustomerQuestion.list(query);
    }
    if (projectIds.length === 0) return [];
    query.allowed_project_ids = projectIds;
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
    const canViewAll = await hasPermission(actor, 'customer_questions.view_all');
    if (!canViewAll && q.project_id) {
      const Project = require('../../db/models/Project');
      const assigned = await Project.isUserAssigned(q.project_id, actor.id);
      if (!assigned) { const err = new Error('Forbidden: user not assigned to this project'); err.statusCode = 403; throw err; }
    }
    return q;
  }

  static async createCustomerQuestion(fields, actor) {
    const requiredPermission = 'customer_questions.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission customer_questions.create'); err.statusCode = 403; throw err; }
    if (!fields || !fields.document_id || !fields.question_text) { const err = new Error('Missing required fields'); err.statusCode = 400; throw err; }
    // default asked_by
    if (!fields.asked_by) fields.asked_by = actor.id;
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
    // If project-scoped, ensure actor assigned unless elevated
    const canUpdateAll = await hasPermission(actor, 'customer_questions.update_all');
    const canViewAllProjects = await hasPermission(actor, 'projects.view_all');
    if (!canUpdateAll && !canViewAllProjects && existing.project_id) {
      const Project = require('../../db/models/Project');
      const isAssigned = await Project.isUserAssigned(existing.project_id, actor.id);
      if (!isAssigned) { const err = new Error('Forbidden: user not assigned to this project'); err.statusCode = 403; throw err; }
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
