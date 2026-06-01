const UserRocketChatService = require('../services/userRocketChatService');

class UserRocketChatController {
  static _assertSelfAccess(req, userId) {
    const actor = req.user || null;
    if (!actor || !actor.id) {
      const err = new Error('Authentication required');
      err.statusCode = 401;
      throw err;
    }

    if (Number(actor.id) !== Number(userId)) {
      const err = new Error('Forbidden');
      err.statusCode = 403;
      throw err;
    }

    return actor;
  }

  static async get(req, res, next) {
    try {
      const userId = Number(req.params.id);
      if (!userId) { const err = new Error('user id required'); err.statusCode = 400; throw err; }
      UserRocketChatController._assertSelfAccess(req, userId);
      const row = await UserRocketChatService.getMapping(userId);
      res.json({ data: row });
    } catch (err) { next(err); }
  }

  static async set(req, res, next) {
    try {
      const userId = Number(req.params.id);
      if (!userId) { const err = new Error('user id required'); err.statusCode = 400; throw err; }
      const actor = UserRocketChatController._assertSelfAccess(req, userId);

      const body = req.body || {};
      const payload = {
        rc_username: body.rc_username || body.rcUsername || null,
        rc_user_id: body.rc_user_id || body.rcUserId || null,
        rc_display_name: body.rc_display_name || body.rcDisplayName || null
      };

      if (!payload.rc_username) {
        const err = new Error('rc_username required'); err.statusCode = 400; throw err;
      }

      const row = await UserRocketChatService.setMapping(userId, payload, actor);
      res.status(201).json({ data: row });
    } catch (err) { next(err); }
  }

  static async remove(req, res, next) {
    try {
      const userId = Number(req.params.id);
      if (!userId) { const err = new Error('user id required'); err.statusCode = 400; throw err; }
      const actor = UserRocketChatController._assertSelfAccess(req, userId);
      const ok = await UserRocketChatService.deleteMapping(userId, actor);
      res.json({ success: !!ok });
    } catch (err) { next(err); }
  }
}

module.exports = UserRocketChatController;
