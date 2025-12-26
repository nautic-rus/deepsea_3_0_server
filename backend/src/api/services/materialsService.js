const Material = require('../../db/models/Material');
const { hasPermission } = require('./permissionChecker');

class MaterialsService {
  static async listMaterials(query = {}, actor) {
    const requiredPermission = 'materials.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission materials.view'); err.statusCode = 403; throw err; }
    return await Material.list(query);
  }

  static async getMaterialById(id, actor) {
    const requiredPermission = 'materials.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission materials.view'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const m = await Material.findById(Number(id));
    if (!m) { const err = new Error('Material not found'); err.statusCode = 404; throw err; }
    return m;
  }

  static async createMaterial(fields, actor) {
    const requiredPermission = 'materials.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission materials.create'); err.statusCode = 403; throw err; }
    if (!fields || !fields.stock_code || !fields.name) { const err = new Error('Missing required fields'); err.statusCode = 400; throw err; }
    if (!fields.created_by) fields.created_by = actor.id;
    return await Material.create(fields);
  }

  static async updateMaterial(id, fields, actor) {
    const requiredPermission = 'materials.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission materials.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const updated = await Material.update(Number(id), fields);
    if (!updated) { const err = new Error('Material not found'); err.statusCode = 404; throw err; }
    return updated;
  }

  static async deleteMaterial(id, actor) {
    const requiredPermission = 'materials.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission materials.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const ok = await Material.softDelete(Number(id));
    if (!ok) { const err = new Error('Material not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }
}

module.exports = MaterialsService;
