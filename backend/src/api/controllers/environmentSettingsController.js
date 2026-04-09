const EnvironmentSettingsService = require('../services/environmentSettingsService');

class EnvironmentSettingsController {
  static async list(req, res, next) {
    try {
      const rows = await EnvironmentSettingsService.list(req.user);
      res.json({ data: rows });
    } catch (error) {
      next(error);
    }
  }

  static async get(req, res, next) {
    try {
      const row = await EnvironmentSettingsService.get(req.params.key, req.user);
      res.json({ data: row });
    } catch (error) {
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const result = await EnvironmentSettingsService.update(req.params.key, (req.body || {}).value, req.user);
      res.json({ data: result.rows[0] || null, meta: { requires_restart: result.requiresRestart } });
    } catch (error) {
      next(error);
    }
  }

  static async updateMany(req, res, next) {
    try {
      const settings = Array.isArray(req.body && req.body.settings) ? req.body.settings : [];
      const result = await EnvironmentSettingsService.updateMany(settings, req.user);
      res.json({ data: result.rows, meta: { requires_restart: result.requiresRestart } });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = EnvironmentSettingsController;