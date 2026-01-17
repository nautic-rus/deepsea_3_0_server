const UserNotification = require('../../db/models/UserNotification');

class UserNotificationsController {
  static async list(req, res, next) {
    try {
      const actor = req.user || null;
      const userId = Number(req.params.id);
      if (!userId) { const err = new Error('user id required'); err.statusCode = 400; throw err; }

      // allow only self
      if (!actor || actor.id !== userId) {
        const err = new Error('Forbidden'); err.statusCode = 403; throw err;
      }

      const options = {
        limit: req.query.limit ? Number(req.query.limit) : 50,
        offset: req.query.offset ? Number(req.query.offset) : 0,
        includeHidden: req.query.include_hidden === 'true' || req.query.includeHidden === 'true'
      };

      const rows = await UserNotification.listForUser(userId, options);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  static async markAsRead(req, res, next) {
    try {
      const actor = req.user || null;
      const userId = Number(req.params.id);
      const notificationId = Number(req.params.notificationId);
      if (!userId || !notificationId) { const err = new Error('user id and notification id required'); err.statusCode = 400; throw err; }

      if (!actor || actor.id !== userId) {
        const err = new Error('Forbidden'); err.statusCode = 403; throw err;
      }

      const row = await UserNotification.markAsRead(notificationId, userId);
      if (!row) { const err = new Error('Notification not found'); err.statusCode = 404; throw err; }
      res.json({ data: row });
    } catch (err) { next(err); }
  }

  static async markAsHidden(req, res, next) {
    try {
      const actor = req.user || null;
      const userId = Number(req.params.id);
      const notificationId = Number(req.params.notificationId);
      if (!userId || !notificationId) { const err = new Error('user id and notification id required'); err.statusCode = 400; throw err; }

      if (!actor || actor.id !== userId) {
        const err = new Error('Forbidden'); err.statusCode = 403; throw err;
      }

      const row = await UserNotification.markAsHidden(notificationId, userId);
      if (!row) { const err = new Error('Notification not found'); err.statusCode = 404; throw err; }
      res.json({ data: row });
    } catch (err) { next(err); }
  }

  static async unreadCount(req, res, next) {
    try {
      const actor = req.user || null;
      const userId = Number(req.params.id);
      if (!userId) { const err = new Error('user id required'); err.statusCode = 400; throw err; }

      if (!actor || actor.id !== userId) {
        const err = new Error('Forbidden'); err.statusCode = 403; throw err;
      }

      const cnt = await UserNotification.countUnread(userId);
      res.json({ data: { unread_count: cnt } });
    } catch (err) { next(err); }
  }
}

module.exports = UserNotificationsController;
