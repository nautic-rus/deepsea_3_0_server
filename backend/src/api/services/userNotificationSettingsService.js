const UserNotificationSetting = require('../../db/models/UserNotificationSetting');
const User = require('../../db/models/User');
const NotificationEvent = require('../../db/models/NotificationEvent');
const NotificationMethod = require('../../db/models/NotificationMethod');

class UserNotificationSettingsService {
  static async list(userId, projectId = null) {
    // validate user exists
    const user = await User.findById(userId);
    if (!user) { const err = new Error('User not found'); err.statusCode = 404; throw err; }

    // Build events x methods matrix for the user (optionally scoped to project)
    const events = await NotificationEvent.listAll();
    const methods = await NotificationMethod.listAll();

    const settings = (projectId === null || projectId === undefined)
      ? await UserNotificationSetting.findByUser(userId)
      : await UserNotificationSetting.findByUserProject(userId, projectId);

    // map existing settings by composite key
    const map = new Map();
    for (const s of settings) {
      const key = `${s.event_id}:${s.method_id}`;
      map.set(key, s);
    }

    // assemble matrix: array of rows where each row corresponds to an event
    const matrix = events.map(ev => {
      const row = {
        event: { id: ev.id, code: ev.code, name: ev.name, description: ev.description },
        methods: methods.map(m => {
          const key = `${ev.id}:${m.id}`;
          const s = map.get(key) || null;
          return {
            method: { id: m.id, code: m.code, name: m.name, description: m.description },
            enabled: s ? !!s.enabled : false,
            config: s ? s.config : null
          };
        })
      };
      return row;
    });

    return { events, methods, matrix };
  }

  static async upsert(userId, data) {
    // data: { project_id, event_id, method_id, enabled, config }
    const { project_id = null, event_id, method_id, enabled = true, config = null } = data;
    if (!event_id || !method_id) { const err = new Error('event_id and method_id required'); err.statusCode = 400; throw err; }

    const existing = await UserNotificationSetting.find(userId, project_id, event_id, method_id);
    if (existing) {
      return await UserNotificationSetting.updateByComposite(userId, project_id, event_id, method_id, { enabled, config });
    }

    return await UserNotificationSetting.create({ user_id: userId, project_id, event_id, method_id, enabled, config });
  }

  static async remove(userId, data) {
    const { project_id = null, event_id, method_id } = data;
    if (!event_id || !method_id) { const err = new Error('event_id and method_id required'); err.statusCode = 400; throw err; }
    await UserNotificationSetting.delete(userId, project_id, event_id, method_id);
    return true;
  }
}

module.exports = UserNotificationSettingsService;
