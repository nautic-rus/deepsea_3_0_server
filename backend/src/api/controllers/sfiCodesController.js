const SfiCodesService = require('../services/sfiCodesService');

class SfiCodesController {
  static async list(req, res, next) {
    try {
      const rows = await SfiCodesService.list(req);
      res.json(rows);
    } catch (err) {
      next(err);
    }
  }

  static async get(req, res, next) {
    try {
      const row = await SfiCodesService.getById(req);
      if (!row) return res.status(404).json({ error: 'Not found' });
      res.json(row);
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    try {
      const row = await SfiCodesService.create(req);
      res.status(201).json(row);
    } catch (err) {
      next(err);
    }
  }

  static async update(req, res, next) {
    try {
      const row = await SfiCodesService.update(req);
      if (!row) return res.status(404).json({ error: 'Not found' });
      res.json(row);
    } catch (err) {
      next(err);
    }
  }

  static async remove(req, res, next) {
    try {
      const ok = await SfiCodesService.remove(req);
      if (!ok) return res.status(404).json({ error: 'Not found' });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = SfiCodesController;
