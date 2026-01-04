const Stage = require('../../db/models/Stage');
const { hasPermission } = require('./permissionChecker');

/**
 * StagesService
 *
 * Provides CRUD operations for project stages with permission enforcement.
 */
class StagesService {
  static async listStages(query = {}, actor) {
    const requiredPermission = 'stages.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission stages.view'); err.statusCode = 403; throw err; }
    return await Stage.list(query);
  }

  static async getStageById(id, actor) {
    const requiredPermission = 'stages.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission stages.view'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const s = await Stage.findById(Number(id));
    if (!s) { const err = new Error('Stage not found'); err.statusCode = 404; throw err; }
    return s;
  }

  static async createStage(fields, actor) {
    const requiredPermission = 'stages.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission stages.create'); err.statusCode = 403; throw err; }
    if (!fields || !fields.project_id || !fields.name || !fields.end_date) { const err = new Error('Missing required fields'); err.statusCode = 400; throw err; }
    if (!fields.created_by) fields.created_by = actor.id;
    return await Stage.create(fields);
  }

  static async updateStage(id, fields, actor) {
    const requiredPermission = 'stages.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission stages.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const updated = await Stage.update(Number(id), fields);
    if (!updated) { const err = new Error('Stage not found'); err.statusCode = 404; throw err; }
    return updated;
  }

  static async deleteStage(id, actor) {
    const requiredPermission = 'stages.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission stages.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const ok = await Stage.softDelete(Number(id));
    if (!ok) { const err = new Error('Stage not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }
}

module.exports = StagesService;
