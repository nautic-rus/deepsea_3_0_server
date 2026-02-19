const SpecializationsService = require('../services/specializationsService');

class SpecializationsController {
  static async list(req, res, next) {
    try {
      const actor = req.user || null;
      const rows = await SpecializationsService.list(actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  static async get(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const row = await SpecializationsService.getById(id, actor);
      if (!row) { const err = new Error('Specialization not found'); err.statusCode = 404; throw err; }
      res.json(row);
    } catch (err) { next(err); }
  }

  static async create(req, res, next) {
    try {
      const actor = req.user || null;
      const created = await SpecializationsService.create(req.body || {}, actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  static async update(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const updated = await SpecializationsService.update(Number(id), req.body || {}, actor);
      res.json({ data: updated });
    } catch (err) { next(err); }
  }

  static async delete(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const ok = await SpecializationsService.delete(Number(id), actor);
      if (!ok) { const err = new Error('Specialization not found'); err.statusCode = 404; throw err; }
      res.json({ message: 'Specialization deleted' });
    } catch (err) { next(err); }
  }
}

module.exports = SpecializationsController;
