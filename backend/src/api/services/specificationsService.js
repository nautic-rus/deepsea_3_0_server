const Specification = require('../../db/models/Specification');
const { hasPermission } = require('./permissionChecker');

class SpecificationsService {
  static async listSpecifications(query = {}, actor) {
    const requiredPermission = 'specifications.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission specifications.view'); err.statusCode = 403; throw err; }
    return await Specification.list(query);
  }

  static async getSpecificationById(id, actor) {
    const requiredPermission = 'specifications.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission specifications.view'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const s = await Specification.findById(Number(id));
    if (!s) { const err = new Error('Specification not found'); err.statusCode = 404; throw err; }
    return s;
  }

  static async createSpecification(fields, actor) {
    const requiredPermission = 'specifications.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission specifications.create'); err.statusCode = 403; throw err; }
    if (!fields || !fields.project_id || !fields.name) { const err = new Error('Missing required fields'); err.statusCode = 400; throw err; }
    if (!fields.created_by) fields.created_by = actor.id;
    return await Specification.create(fields);
  }

  static async updateSpecification(id, fields, actor) {
    const requiredPermission = 'specifications.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission specifications.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const updated = await Specification.update(Number(id), fields);
    if (!updated) { const err = new Error('Specification not found'); err.statusCode = 404; throw err; }
    return updated;
  }

  static async deleteSpecification(id, actor) {
    const requiredPermission = 'specifications.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission specifications.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const ok = await Specification.softDelete(Number(id));
    if (!ok) { const err = new Error('Specification not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }
}

module.exports = SpecificationsService;
