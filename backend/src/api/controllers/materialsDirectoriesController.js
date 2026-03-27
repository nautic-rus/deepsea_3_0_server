const MaterialsDirectoriesService = require('../services/materialsDirectoriesService');

class MaterialsDirectoriesController {
  static async list(req, res) {
    try {
      const rows = await MaterialsDirectoriesService.list(req);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async get(req, res) {
    try {
      const row = await MaterialsDirectoriesService.getById(req);
      if (!row) return res.status(404).json({ error: 'Not found' });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async create(req, res) {
    try {
      const row = await MaterialsDirectoriesService.create(req);
      res.status(201).json(row);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async update(req, res) {
    try {
      const row = await MaterialsDirectoriesService.update(req);
      if (!row) return res.status(404).json({ error: 'Not found' });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async remove(req, res) {
    try {
      const ok = await MaterialsDirectoriesService.remove(req);
      if (!ok) return res.status(404).json({ error: 'Not found' });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = MaterialsDirectoriesController;
