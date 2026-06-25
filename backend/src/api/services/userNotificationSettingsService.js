const UserNotificationSetting = require('../../db/models/UserNotificationSetting');
const User = require('../../db/models/User');
const NotificationEvent = require('../../db/models/NotificationEvent');
const NotificationMethod = require('../../db/models/NotificationMethod');

class UserNotificationSettingsService {
  static _toNullableInteger(value, fieldName) {
    if (value === undefined || value === null || value === '') return null;
    const num = Number(value);
    if (Number.isNaN(num)) {
      const err = new Error(`Invalid ${fieldName}`);
      err.statusCode = 400;
      throw err;
    }
    return num;
  }

  static async list(userId, projectId = null, specializationId = null) {
    // validate user exists
    const user = await User.findById(userId);
    if (!user) { const err = new Error('User not found'); err.statusCode = 404; throw err; }

    // Build events x methods matrix for the user (optionally scoped to project)
    const events = await NotificationEvent.listAll();
    const methods = await NotificationMethod.listAll();

    const normalizedProjectId = UserNotificationSettingsService._toNullableInteger(projectId, 'project_id');
    const normalizedSpecializationId = UserNotificationSettingsService._toNullableInteger(specializationId, 'specialization_id');

    const settings = normalizedProjectId === null
      ? await UserNotificationSetting.findByUser(userId, normalizedSpecializationId)
      : await UserNotificationSetting.findByUserProject(userId, normalizedProjectId, normalizedSpecializationId);

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
    // data: { project_id, specialization_id, event_id, method_id, enabled, config }
    const { project_id = null, specialization_id = null, event_id, method_id, enabled = true, config = null } = data;
    const normalizedProjectId = UserNotificationSettingsService._toNullableInteger(project_id, 'project_id');
    const normalizedSpecializationId = UserNotificationSettingsService._toNullableInteger(specialization_id, 'specialization_id');
    if (!event_id || !method_id) { const err = new Error('event_id and method_id required'); err.statusCode = 400; throw err; }

    const existing = await UserNotificationSetting.find(userId, normalizedProjectId, normalizedSpecializationId, event_id, method_id);
    if (existing) {
      return await UserNotificationSetting.updateByComposite(userId, normalizedProjectId, normalizedSpecializationId, event_id, method_id, { enabled, config });
    }

    return await UserNotificationSetting.create({
      user_id: userId,
      project_id: normalizedProjectId,
      specialization_id: normalizedSpecializationId,
      event_id,
      method_id,
      enabled,
      config
    });
  }

  static async remove(userId, data) {
    const { project_id = null, specialization_id = null, event_id, method_id } = data;
    const normalizedProjectId = UserNotificationSettingsService._toNullableInteger(project_id, 'project_id');
    const normalizedSpecializationId = UserNotificationSettingsService._toNullableInteger(specialization_id, 'specialization_id');
    if (!event_id || !method_id) { const err = new Error('event_id and method_id required'); err.statusCode = 400; throw err; }
    await UserNotificationSetting.delete(userId, normalizedProjectId, normalizedSpecializationId, event_id, method_id);
    return true;
  }
}

module.exports = UserNotificationSettingsService;
