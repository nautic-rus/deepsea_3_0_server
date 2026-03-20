const TimeLogsService = require('../services/timeLogsService');

class TimeLogsController {
  static async list(req, res, next) {
    try {
      const actor = req.user || null;
      const q = Object.assign({}, req.query || {});
      // accept start_date/end_date as aliases
      if (q.start_date && !q.date_after) q.date_after = q.start_date;
      if (q.end_date && !q.date_before) q.date_before = q.end_date;
      // normalize pagination
      if (q.page) q.page = Number(q.page) || 1;
      if (q.limit) q.limit = Number(q.limit) || undefined;
      // parse comma-separated numeric params into arrays
      ['issue_id', 'user_id', 'id'].forEach(k => {
        if (q[k] && typeof q[k] === 'string' && q[k].includes(',')) {
          q[k] = q[k].split(',').map(s => s.trim()).filter(Boolean).map(v => Number(v));
        } else if (q[k] && typeof q[k] === 'string') {
          const n = Number(q[k]);
          if (!Number.isNaN(n)) q[k] = n;
        }
      });
      // parse comma-separated date values
      if (q.date && typeof q.date === 'string' && q.date.includes(',')) {
        q.date = q.date.split(',').map(s => s.trim()).filter(Boolean);
      }

      const rows = await TimeLogsService.listTimeLogs(q, actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  static async listMine(req, res, next) {
    try {
      const actor = req.user || null;
      const rows = await TimeLogsService.listMyTimeLogs(req.query || {}, actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  static async get(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const row = await TimeLogsService.getTimeLogById(id, actor);
      res.json(row);
    } catch (err) { next(err); }
  }

  static async create(req, res, next) {
    try {
      const actor = req.user || null;
      const created = await TimeLogsService.createTimeLog(req.body || {}, actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  static async update(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const updated = await TimeLogsService.updateTimeLog(id, req.body || {}, actor);
      res.json({ data: updated });
    } catch (err) { next(err); }
  }

  static async delete(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      await TimeLogsService.deleteTimeLog(id, actor);
      res.json({ message: 'Time log deleted' });
    } catch (err) { next(err); }
  }
}

module.exports = TimeLogsController;
