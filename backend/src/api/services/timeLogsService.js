const TimeLog = require('../../db/models/TimeLog');
const { hasPermission } = require('./permissionChecker');

class TimeLogsService {
  static async listTimeLogs(query = {}, actor) {
    const requiredPermission = 'time_logs.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission time_logs.view'); err.statusCode = 403; throw err; }
    return await TimeLog.list(query);
  }

  static async getTimeLogById(id, actor) {
    const requiredPermission = 'time_logs.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission time_logs.view'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const r = await TimeLog.findById(Number(id));
    if (!r) { const err = new Error('Time log not found'); err.statusCode = 404; throw err; }
    return r;
  }

  static async createTimeLog(fields, actor) {
    const requiredPermission = 'time_logs.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission time_logs.create'); err.statusCode = 403; throw err; }
    if (!fields || !fields.issue_id || !fields.user_id || !fields.hours || !fields.date) { const err = new Error('Missing required fields'); err.statusCode = 400; throw err; }
    return await TimeLog.create(fields);
  }

  static async updateTimeLog(id, fields, actor) {
    const requiredPermission = 'time_logs.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission time_logs.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const updated = await TimeLog.update(Number(id), fields);
    if (!updated) { const err = new Error('Time log not found'); err.statusCode = 404; throw err; }
    return updated;
  }

  static async deleteTimeLog(id, actor) {
    const requiredPermission = 'time_logs.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission time_logs.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const ok = await TimeLog.delete(Number(id));
    if (!ok) { const err = new Error('Time log not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }
}

module.exports = TimeLogsService;
