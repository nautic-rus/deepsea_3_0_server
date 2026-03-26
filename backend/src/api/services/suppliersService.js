const Supplier = require('../../db/models/Supplier');
const { hasPermission } = require('./permissionChecker');

/**
 * SuppliersService
 *
 * Service layer for supplier CRUD and access control. Delegates DB calls to
 * the Supplier model after verifying permissions.
 */
class SuppliersService {
  static async listSuppliers(query = {}, actor) {
    const requiredPermission = 'suppliers.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission suppliers.view'); err.statusCode = 403; throw err; }
    return await Supplier.list(query);
  }

  static async getSupplierById(id, actor) {
    const requiredPermission = 'suppliers.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission suppliers.view'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const s = await Supplier.findById(Number(id));
    if (!s) { const err = new Error('Supplier not found'); err.statusCode = 404; throw err; }
    return s;
  }

  static async createSupplier(fields, actor) {
    const requiredPermission = 'suppliers.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission suppliers.create'); err.statusCode = 403; throw err; }
    if (!fields || !fields.name) { const err = new Error('Missing required field: name'); err.statusCode = 400; throw err; }
    if (!fields.created_by) fields.created_by = actor.id;
    return await Supplier.create(fields);
  }

  static async updateSupplier(id, fields, actor) {
    const requiredPermission = 'suppliers.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission suppliers.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    if (actor) fields.updated_by = actor.id;
    const updated = await Supplier.update(Number(id), fields);
    if (!updated) { const err = new Error('Supplier not found'); err.statusCode = 404; throw err; }
    return updated;
  }

  static async deleteSupplier(id, actor) {
    const requiredPermission = 'suppliers.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission suppliers.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const ok = await Supplier.softDelete(Number(id));
    if (!ok) { const err = new Error('Supplier not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }
}

module.exports = SuppliersService;

