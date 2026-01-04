const Equipment = require('../../db/models/Equipment');
const { hasPermission } = require('./permissionChecker');

/**
 * EquipmentService
 *
 * Service layer for equipment CRUD and access control. Delegates DB calls to
 * the Equipment model after verifying permissions.
 */
class EquipmentService {
  static async listEquipment(query = {}, actor) {
    const requiredPermission = 'equipment.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission equipment.view'); err.statusCode = 403; throw err; }
    return await Equipment.list(query);
  }

  static async getEquipmentById(id, actor) {
    const requiredPermission = 'equipment.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission equipment.view'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const e = await Equipment.findById(Number(id));
    if (!e) { const err = new Error('Equipment not found'); err.statusCode = 404; throw err; }
    return e;
  }

  static async createEquipment(fields, actor) {
    const requiredPermission = 'equipment.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission equipment.create'); err.statusCode = 403; throw err; }
    if (!fields || !fields.equipment_code || !fields.name || !fields.sfi_code_id) { const err = new Error('Missing required fields'); err.statusCode = 400; throw err; }
    if (!fields.created_by) fields.created_by = actor.id;
    return await Equipment.create(fields);
  }

  static async updateEquipment(id, fields, actor) {
    const requiredPermission = 'equipment.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission equipment.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const updated = await Equipment.update(Number(id), fields);
    if (!updated) { const err = new Error('Equipment not found'); err.statusCode = 404; throw err; }
    return updated;
  }

  static async deleteEquipment(id, actor) {
    const requiredPermission = 'equipment.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission equipment.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const ok = await Equipment.softDelete(Number(id));
    if (!ok) { const err = new Error('Equipment not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }
}

module.exports = EquipmentService;
