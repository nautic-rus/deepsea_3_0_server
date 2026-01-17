const UserNotificationSetting = require('../../db/models/UserNotificationSetting');
const User = require('../../db/models/User');

class UserNotificationSettingsService {
  static async list(userId, projectId = null) {
    // validate user exists
    const user = await User.findById(userId);
    if (!user) { const err = new Error('User not found'); err.statusCode = 404; throw err; }

    if (projectId === null || projectId === undefined) {
      return await UserNotificationSetting.findByUser(userId);
    }
    return await UserNotificationSetting.findByUserProject(userId, projectId);
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
