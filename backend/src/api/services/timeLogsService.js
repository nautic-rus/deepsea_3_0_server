const TimeLog = require('../../db/models/TimeLog');
const { hasPermission } = require('./permissionChecker');
const pool = require('../../db/connection');
const { getEnvironmentSetting } = require('../../config/environmentSettings');
const HistoryService = require('./historyService');

class TimeLogsService {
  static formatDateForHistory(dateValue) {
    if (!dateValue) return '';

    if (dateValue instanceof Date && !Number.isNaN(dateValue.getTime())) {
      const day = String(dateValue.getUTCDate()).padStart(2, '0');
      const month = String(dateValue.getUTCMonth() + 1).padStart(2, '0');
      const year = String(dateValue.getUTCFullYear());
      return `${day}.${month}.${year}`;
    }

    const date = String(dateValue).trim();
    const isoMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      return `${isoMatch[3]}.${isoMatch[2]}.${isoMatch[1]}`;
    }

    const parsed = new Date(date);
    if (!Number.isNaN(parsed.getTime())) {
      const day = String(parsed.getUTCDate()).padStart(2, '0');
      const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
      const year = String(parsed.getUTCFullYear());
      return `${day}.${month}.${year}`;
    }

    return date;
  }

  static async recordIssueHistoryForTimeLog(timeLog, actor) {
    try {
      const hours = Number(timeLog && timeLog.hours);
      const hoursText = Number.isFinite(hours) ? hours.toFixed(2) : String(timeLog && timeLog.hours);
      const dateText = TimeLogsService.formatDateForHistory(timeLog && timeLog.date);
      const message = `${hoursText}h(${dateText})`;
      await HistoryService.addIssueHistory(Number(timeLog.issue_id), actor, 'time_logged', message);
    } catch (error) {
      console.error('Failed to write issue history for time log creation', error && error.message ? error.message : error);
    }
  }

  static async getMaxHoursPerDay() {
    const setting = await getEnvironmentSetting('MAX_HOURS_PER_DAY');
    const value = Number(setting && setting.value);
    if (!Number.isFinite(value) || value <= 0) {
      const err = new Error('Invalid environment setting MAX_HOURS_PER_DAY');
      err.statusCode = 500;
      throw err;
    }
    return value;
  }

  static async assertDailyHoursLimit({ user_id, date, hours }) {
    const userId = Number(user_id);
    const loggedDate = String(date || '').trim();
    const requestedHours = Number(hours);

    if (!userId || !loggedDate || !Number.isFinite(requestedHours)) {
      const err = new Error('Invalid time log payload for daily hours validation');
      err.statusCode = 400;
      throw err;
    }

    const maxHoursPerDay = await this.getMaxHoursPerDay();
    const res = await pool.query(
      `SELECT COALESCE(SUM(hours), 0) AS total_hours
       FROM time_logs
       WHERE user_id = $1 AND date = $2`,
      [userId, loggedDate]
    );
    const existingHours = Number(res.rows[0] && res.rows[0].total_hours) || 0;
    const nextTotal = existingHours + requestedHours;

    if (nextTotal > maxHoursPerDay) {
      const err = new Error(`Daily hours limit exceeded: ${nextTotal} > ${maxHoursPerDay} for user ${userId} on ${loggedDate}`);
      err.statusCode = 400;
      throw err;
    }
  }

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

  static async listTimeLogsByIssue(issueId, query = {}, actor) {
    const requiredPermission = 'time_logs.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission time_logs.view'); err.statusCode = 403; throw err; }
    if (!issueId || Number.isNaN(Number(issueId))) { const err = new Error('Invalid issue_id'); err.statusCode = 400; throw err; }

    const filters = Object.assign({}, query, { issue_id: Number(issueId) });
    return await TimeLog.list(filters);
  }

  static async createTimeLog(fields, actor) {
    const requiredPermission = 'time_logs.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission time_logs.create'); err.statusCode = 403; throw err; }
    // Support interval creation: fields.interval = { start_date, end_date, days, hours, issue_id?, user_id?, description? }
    if (fields && fields.interval) {
      const interval = fields.interval || {};
      const start = interval.start_date || interval.start || null;
      const end = interval.end_date || interval.end || null;
      const hours = interval.hours != null ? interval.hours : null;
      if (!start || !end || hours == null) { const err = new Error('Missing required interval fields (start_date, end_date, hours)'); err.statusCode = 400; throw err; }

      // days: optional array of weekdays. Accept numbers (0=Sun..6=Sat) or short names (mon,tue,...)
      let daysOfWeek = null;
      if (Array.isArray(interval.days) && interval.days.length) {
        const nameMap = { sun:0, mon:1, tue:2, wed:3, thu:4, fri:5, sat:6 };
        daysOfWeek = interval.days.map(d => {
          if (typeof d === 'string') return nameMap[d.toLowerCase().slice(0,3)] || null;
          if (typeof d === 'number') return Number(d);
          return null;
        }).filter(v => v !== null && !Number.isNaN(v));
      } else {
        // default: Mon-Fri
        daysOfWeek = [1,2,3,4,5];
      }

      const s = new Date(start);
      const e = new Date(end);
      if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || s > e) { const err = new Error('Invalid interval dates'); err.statusCode = 400; throw err; }

      // guard to prevent creating too many entries
      const maxEntries = 365;
      const created = [];
      let cur = new Date(s);
      let count = 0;
      while (cur <= e) {
        const dow = cur.getDay();
        if (daysOfWeek.includes(dow)) {
          const dateStr = cur.toISOString().slice(0,10);
          const row = {
            issue_id: fields.issue_id || interval.issue_id,
            user_id: fields.user_id || interval.user_id || actor.id,
            hours: hours,
            date: dateStr,
            description: fields.description || interval.description || null
          };
          if (!row.issue_id || !row.user_id) { const err = new Error('Missing required fields: issue_id and user_id must be provided either at top-level or inside interval'); err.statusCode = 400; throw err; }
          await TimeLogsService.assertDailyHoursLimit(row);
          const createdRow = await TimeLog.create(row);
          await TimeLogsService.recordIssueHistoryForTimeLog(createdRow, actor);
          created.push(createdRow);
          count++;
          if (count > maxEntries) { const err = new Error('Interval too large'); err.statusCode = 400; throw err; }
        }
        cur.setDate(cur.getDate() + 1);
      }
      if (created.length === 0) { const err = new Error('No dates matched the interval'); err.statusCode = 400; throw err; }
      return created;
    }

    // Single time log
    if (!fields || !fields.issue_id || !fields.user_id || !fields.hours || !fields.date) { const err = new Error('Missing required fields'); err.statusCode = 400; throw err; }
    await TimeLogsService.assertDailyHoursLimit(fields);
    const created = await TimeLog.create(fields);
    await TimeLogsService.recordIssueHistoryForTimeLog(created, actor);
    return created;
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
      let q = `SELECT
        t.id,
        t.issue_id,
        ${TimeLog.userJsonSql('u')} AS user,
        t.hours,
        t.date,
        t.description,
        t.created_at,
        t.updated_at
        FROM time_logs t
        JOIN issues i ON t.issue_id = i.id
        LEFT JOIN users u ON u.id = t.user_id
        WHERE t.user_id = $` + (idx++);
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
