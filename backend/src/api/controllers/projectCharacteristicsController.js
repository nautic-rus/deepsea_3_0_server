const ProjectsService = require('../services/projectsService');

class ProjectCharacteristicsController {
  static async upsert(req, res, next) {
    try {
      const actor = req.user || null;
      const projectId = parseInt(req.params.id, 10);
      const payload = req.body || {};
      const row = await ProjectsService.upsertCharacteristics(projectId, payload, actor);
      res.json({ data: row });
    } catch (err) { next(err); }
  }

  static async remove(req, res, next) {
    try {
      const actor = req.user || null;
      const projectId = parseInt(req.params.id, 10);
      const result = await ProjectsService.deleteCharacteristics(projectId, actor);
      res.json({ data: result });
    } catch (err) { next(err); }
  }
}

module.exports = ProjectCharacteristicsController;
