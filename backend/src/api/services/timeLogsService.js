const TimeLog = require('../../db/models/TimeLog');
const { hasPermission } = require('./permissionChecker');
const pool = require('../../db/connection');

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

  static async listMyTimeLogs(query = {}, actor) {
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    // prepare filters - ensure user_id is set to current actor
    const filters = Object.assign({}, query);
    filters.user_id = actor.id;
    // accept start_date/end_date aliases
    if (filters.start_date) { filters.date_after = filters.start_date; delete filters.start_date; }
    if (filters.end_date) { filters.date_before = filters.end_date; delete filters.end_date; }

    // If project_id provided, perform join with issues to filter by project
    if (filters.project_id) {
      const vals = [];
      let idx = 1;
      let q = 'SELECT t.id, t.issue_id, t.user_id, t.hours, t.date, t.description, t.created_at, t.updated_at FROM time_logs t JOIN issues i ON t.issue_id = i.id WHERE t.user_id = $' + (idx++);
      vals.push(actor.id);
      q += ' AND i.project_id = $' + (idx++);
      vals.push(filters.project_id);
      if (filters.issue_id) { q += ' AND t.issue_id = $' + (idx++); vals.push(filters.issue_id); }
      if (filters.date_after) { q += ' AND t.date >= $' + (idx++); vals.push(filters.date_after); }
      if (filters.date_before) { q += ' AND t.date <= $' + (idx++); vals.push(filters.date_before); }
      q += ' ORDER BY t.id';
      if (filters.limit != null) {
        const page = filters.page || 1;
        const offset = (page - 1) * filters.limit;
        q += ' LIMIT $' + (idx++) + ' OFFSET $' + (idx++);
        vals.push(filters.limit, offset);
      }
      const res = await pool.query(q, vals);
      return res.rows;
    }

    // fallback to existing model list with user_id and date filters
    return await TimeLog.list(filters);
  }
}

module.exports = TimeLogsService;
