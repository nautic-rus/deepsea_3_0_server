const UnitsService = require('../services/unitsService');

class UnitsController {
  static async list(req, res) {
    try {
      const rows = await UnitsService.list(req);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async get(req, res) {
    try {
      const row = await UnitsService.getById(req);
      if (!row) return res.status(404).json({ error: 'Not found' });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async create(req, res) {
    try {
      const row = await UnitsService.create(req);
      res.status(201).json(row);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async update(req, res) {
    try {
      const row = await UnitsService.update(req);
      if (!row) return res.status(404).json({ error: 'Not found' });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async remove(req, res) {
    try {
      const ok = await UnitsService.remove(req);
      if (!ok) return res.status(404).json({ error: 'Not found' });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = UnitsController;
