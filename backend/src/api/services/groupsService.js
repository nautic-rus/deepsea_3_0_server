const Group = require('../../db/models/Group');
const { hasPermission } = require('./permissionChecker');

class GroupsService {
  static async listGroups(actor) {
    const requiredPermission = 'groups.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission groups.view'); err.statusCode = 403; throw err; }
    return Group.list();
  }

  static async createGroup(name, description, actor) {
    const requiredPermission = 'groups.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission groups.create'); err.statusCode = 403; throw err; }
    if (!name || !name.trim()) { const err = new Error('Name required'); err.statusCode = 400; throw err; }
    return Group.create(name.trim(), description && typeof description === 'string' ? description.trim() : null);
  }

  static async updateGroup(id, fields, actor) {
    const requiredPermission = 'groups.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission groups.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id)) || Number(id) <= 0) { const err = new Error('Invalid group id'); err.statusCode = 400; throw err; }
    const updated = await Group.update(Number(id), fields);
    if (!updated) { const err = new Error('Group not found'); err.statusCode = 404; throw err; }
    return updated;
  }

  static async deleteGroup(id, actor) {
    const requiredPermission = 'groups.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission groups.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id)) || Number(id) <= 0) { const err = new Error('Invalid group id'); err.statusCode = 400; throw err; }
    const ok = await Group.softDelete(Number(id));
    if (!ok) { const err = new Error('Group not found or could not be deleted'); err.statusCode = 404; throw err; }
    return { success: true };
  }
}

module.exports = GroupsService;
