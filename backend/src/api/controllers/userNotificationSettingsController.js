const UserNotificationSettingsService = require('../services/userNotificationSettingsService');

class UserNotificationSettingsController {
  static async list(req, res, next) {
    try {
      const userId = req.user && req.user.id ? Number(req.user.id) : null;
      if (!userId) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
      const projectId = req.query.project_id ? Number(req.query.project_id) : null;
      const rows = await UserNotificationSettingsService.list(userId, projectId);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  static async upsert(req, res, next) {
    try {
      const actor = req.user || null;
      const userId = req.user && req.user.id ? Number(req.user.id) : null;
      if (!userId) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
      const body = req.body || {};
      const payload = {
        project_id: body.project_id !== undefined ? body.project_id : null,
        event_id: body.event_id || body.eventId || null,
        method_id: body.method_id || body.methodId || null,
        enabled: typeof body.enabled === 'boolean' ? body.enabled : true,
        config: body.config || null
      };
      const row = await UserNotificationSettingsService.upsert(userId, payload);
      res.status(201).json({ data: row });
    } catch (err) { next(err); }
  }

  static async remove(req, res, next) {
    try {
      const actor = req.user || null;
      const userId = req.user && req.user.id ? Number(req.user.id) : null;
      if (!userId) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
      const body = req.body || {};
      const payload = {
        project_id: body.project_id !== undefined ? body.project_id : null,
        event_id: body.event_id || body.eventId || null,
        method_id: body.method_id || body.methodId || null
      };
      const ok = await UserNotificationSettingsService.remove(userId, payload);
      res.json({ success: !!ok });
    } catch (err) { next(err); }
  }
}

module.exports = UserNotificationSettingsController;
