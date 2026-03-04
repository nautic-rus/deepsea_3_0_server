const NotificationEventsService = require('../services/notificationEventsService');

class NotificationEventsController {
  static async list(req, res, next) {
    try {
      const actor = req.user;
      const rows = await NotificationEventsService.list(actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  static async get(req, res, next) {
    try {
      const actor = req.user;
      const id = Number(req.params.id);
      const row = await NotificationEventsService.get(id, actor);
      res.json({ data: row });
    } catch (err) { next(err); }
  }

  static async create(req, res, next) {
    try {
      const actor = req.user;
      const body = req.body || {};
      const created = await NotificationEventsService.create(body, actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  static async update(req, res, next) {
    try {
      const actor = req.user;
      const id = Number(req.params.id);
      const body = req.body || {};
      const updated = await NotificationEventsService.update(id, body, actor);
      res.json({ data: updated });
    } catch (err) { next(err); }
  }

  static async remove(req, res, next) {
    try {
      const actor = req.user;
      const id = Number(req.params.id);
      await NotificationEventsService.remove(id, actor);
      res.json({ success: true });
    } catch (err) { next(err); }
  }
}

module.exports = NotificationEventsController;
