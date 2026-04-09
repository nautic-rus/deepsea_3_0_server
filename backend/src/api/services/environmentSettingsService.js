const { hasPermission } = require('./permissionChecker');
const {
  listEnvironmentSettings,
  getEnvironmentSetting,
  updateEnvironmentSettings
} = require('../../config/environmentSettings');

class EnvironmentSettingsService {
  static async assertPermission(actor, permissionCode) {
    if (!actor || !actor.id) {
      const err = new Error('Authentication required');
      err.statusCode = 401;
      throw err;
    }
    const allowed = await hasPermission(actor, permissionCode);
    if (!allowed) {
      const err = new Error(`Forbidden: missing permission ${permissionCode}`);
      err.statusCode = 403;
      throw err;
    }
  }

  static async list(actor) {
    await this.assertPermission(actor, 'environment_settings.view');
    return listEnvironmentSettings();
  }

  static async get(key, actor) {
    await this.assertPermission(actor, 'environment_settings.view');
    return getEnvironmentSetting(key);
  }

  static async update(key, value, actor) {
    await this.assertPermission(actor, 'environment_settings.update');
    return updateEnvironmentSettings([{ key, value }]);
  }

  static async updateMany(settings, actor) {
    await this.assertPermission(actor, 'environment_settings.update');
    return updateEnvironmentSettings(settings);
  }
}

module.exports = EnvironmentSettingsService;