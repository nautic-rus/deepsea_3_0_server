const WikiSectionsService = require('../services/wikiSectionsService');

class WikiSectionsController {
  static async list(req, res, next) {
    try {
      const actor = req.user || null;
      const rows = await WikiSectionsService.listSections(req.query || {}, actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  static async get(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const row = await WikiSectionsService.getSectionById(id, actor);
      res.json(row);
    } catch (err) { next(err); }
  }

  static async create(req, res, next) {
    try {
      const actor = req.user || null;
      const created = await WikiSectionsService.createSection(req.body || {}, actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  static async update(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const updated = await WikiSectionsService.updateSection(id, req.body || {}, actor);
      res.json({ data: updated });
    } catch (err) { next(err); }
  }

  static async delete(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      await WikiSectionsService.deleteSection(id, actor);
      res.json({ message: 'Section deleted' });
    } catch (err) { next(err); }
  }
}

module.exports = WikiSectionsController;
