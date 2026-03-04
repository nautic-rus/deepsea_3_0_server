const NotificationMethodsService = require('../services/notificationMethodsService');

class NotificationMethodsController {
  static async list(req, res, next) {
    try {
      const actor = req.user;
      const rows = await NotificationMethodsService.list(actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  static async get(req, res, next) {
    try {
      const actor = req.user;
      const id = Number(req.params.id);
      const row = await NotificationMethodsService.get(id, actor);
      res.json({ data: row });
    } catch (err) { next(err); }
  }

  static async create(req, res, next) {
    try {
      const actor = req.user;
      const body = req.body || {};
      const created = await NotificationMethodsService.create(body, actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  static async update(req, res, next) {
    try {
      const actor = req.user;
      const id = Number(req.params.id);
      const body = req.body || {};
      const updated = await NotificationMethodsService.update(id, body, actor);
      res.json({ data: updated });
    } catch (err) { next(err); }
  }

  static async remove(req, res, next) {
    try {
      const actor = req.user;
      const id = Number(req.params.id);
      await NotificationMethodsService.remove(id, actor);
      res.json({ success: true });
    } catch (err) { next(err); }
  }
}

module.exports = NotificationMethodsController;
