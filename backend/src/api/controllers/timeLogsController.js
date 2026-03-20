const TimeLogsService = require('../services/timeLogsService');

class TimeLogsController {
  static async list(req, res, next) {
    try {
      const actor = req.user || null;
      const rows = await TimeLogsService.listTimeLogs(req.query || {}, actor);
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
