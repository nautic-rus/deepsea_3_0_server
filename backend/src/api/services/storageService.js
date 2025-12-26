const Storage = require('../../db/models/Storage');
const { hasPermission } = require('./permissionService');

class StorageService {
  static async listStorage(query = {}, actor) {
    const requiredPermission = 'storage.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission storage.view'); err.statusCode = 403; throw err; }
    return await Storage.list(query);
  }

  static async getStorageById(id, actor) {
    const requiredPermission = 'storage.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission storage.view'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const s = await Storage.findById(Number(id));
    if (!s) { const err = new Error('Storage item not found'); err.statusCode = 404; throw err; }
    return s;
  }

  static async createStorage(fields, actor) {
    const requiredPermission = 'storage.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission storage.create'); err.statusCode = 403; throw err; }
    if (!fields || !fields.bucket_name || !fields.object_key) { const err = new Error('Missing required fields'); err.statusCode = 400; throw err; }
    if (!fields.uploaded_by) fields.uploaded_by = actor.id;
    return await Storage.create(fields);
  }

  static async updateStorage(id, fields, actor) {
    const requiredPermission = 'storage.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission storage.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const updated = await Storage.update(Number(id), fields);
    if (!updated) { const err = new Error('Storage item not found'); err.statusCode = 404; throw err; }
    return updated;
  }

  static async deleteStorage(id, actor) {
    const requiredPermission = 'storage.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission storage.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const ok = await Storage.softDelete(Number(id));
    if (!ok) { const err = new Error('Storage item not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }
}

module.exports = StorageService;
