const NotificationMethod = require('../../db/models/NotificationMethod');
const ProtectionService = require('./protectionService');
const { hasPermission } = require('./permissionChecker');

class NotificationMethodsService {
  static async list(actor) {
    const required = 'notification_methods.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, required);
    if (!allowed) { const err = new Error('Forbidden: missing permission ' + required); err.statusCode = 403; throw err; }
    return NotificationMethod.listAll();
  }

  static async get(id, actor) {
    const required = 'notification_methods.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, required);
    if (!allowed) { const err = new Error('Forbidden: missing permission ' + required); err.statusCode = 403; throw err; }
    const row = await NotificationMethod.findById(Number(id));
    if (!row) { const err = new Error('Not found'); err.statusCode = 404; throw err; }
    return row;
  }

  static async create(data, actor) {
    const required = 'notification_methods.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, required);
    if (!allowed) { const err = new Error('Forbidden: missing permission ' + required); err.statusCode = 403; throw err; }
    if (!data || !data.code) { const err = new Error('code required'); err.statusCode = 400; throw err; }
    return NotificationMethod.create({ code: data.code, name: data.name || null, description: data.description || null, status: typeof data.status === 'undefined' ? true : !!data.status });
  }

  static async update(id, data, actor) {
    const required = 'notification_methods.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, required);
    if (!allowed) { const err = new Error('Forbidden: missing permission ' + required); err.statusCode = 403; throw err; }
    const existing = await NotificationMethod.findById(Number(id));
    if (!existing) { const err = new Error('Not found'); err.statusCode = 404; throw err; }
    const fields = [];
    const params = [];
    let idx = 1;
    if (data.code !== undefined) { fields.push(`code = $${idx++}`); params.push(data.code); }
    if (data.name !== undefined) { fields.push(`name = $${idx++}`); params.push(data.name); }
    if (data.description !== undefined) { fields.push(`description = $${idx++}`); params.push(data.description); }
    if (data.status !== undefined) { fields.push(`status = $${idx++}`); params.push(!!data.status); }
    if (fields.length === 0) return existing;
    params.push(id);
    const pool = require('../../db/connection');
    const q = `UPDATE public.notification_methods SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING *`;
    const res = await pool.query(q, params);
    return res.rows[0] || null;
  }

  static async remove(id, actor) {
    const required = 'notification_methods.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, required);
    if (!allowed) { const err = new Error('Forbidden: missing permission ' + required); err.statusCode = 403; throw err; }
    const pool = require('../../db/connection');
    await ProtectionService.assertNotProtected('notification_methods', Number(id));
    const res = await pool.query('DELETE FROM public.notification_methods WHERE id = $1', [Number(id)]);
    return res.rowCount > 0;
  }
}

module.exports = NotificationMethodsService;
