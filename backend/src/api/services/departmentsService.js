const Department = require('../../db/models/Department');
const { hasPermission } = require('./permissionChecker');

class DepartmentsService {
  static async listDepartments(actor) {
    const requiredPermission = 'departments.view';
    if (!actor || !actor.id) {
      const err = new Error('Authentication required'); err.statusCode = 401; throw err;
    }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission departments.view'); err.statusCode = 403; throw err; }
    return Department.list();
  }

  static async createDepartment(name, actor) {
    const requiredPermission = 'departments.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission departments.create'); err.statusCode = 403; throw err; }
    if (!name || !name.trim()) { const err = new Error('Name required'); err.statusCode = 400; throw err; }
    return Department.create(name.trim());
  }

  static async updateDepartment(id, fields, actor) {
    const requiredPermission = 'departments.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
  const { hasPermission } = require('./permissionChecker');
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission departments.update'); err.statusCode = 403; throw err; }

    if (!id || Number.isNaN(Number(id)) || Number(id) <= 0) {
      const err = new Error('Invalid department id'); err.statusCode = 400; throw err;
    }

    // Basic validation
    if (fields.name !== undefined && (!fields.name || typeof fields.name !== 'string')) {
      const err = new Error('Invalid name'); err.statusCode = 400; throw err;
    }

    const updated = await Department.update(Number(id), fields);
    if (!updated) { const err = new Error('Department not found'); err.statusCode = 404; throw err; }
    return updated;
  }

  static async deleteDepartment(id, actor) {
    const requiredPermission = 'departments.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
  const { hasPermission } = require('./permissionChecker');
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission departments.delete'); err.statusCode = 403; throw err; }

    if (!id || Number.isNaN(Number(id)) || Number(id) <= 0) {
      const err = new Error('Invalid department id'); err.statusCode = 400; throw err;
    }

    // Attempt soft-delete
    const ok = await Department.softDelete(Number(id));
    if (!ok) { const err = new Error('Department not found or could not be deleted'); err.statusCode = 404; throw err; }
    return { success: true };
  }
}

module.exports = DepartmentsService;
