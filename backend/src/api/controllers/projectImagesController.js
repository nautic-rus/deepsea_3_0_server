const ProjectsService = require('../services/projectsService');

class ProjectImagesController {
  static async create(req, res, next) {
    try {
      const actor = req.user || null;
      const projectId = parseInt(req.params.id, 10);
      const payload = req.body || {};
      const row = await ProjectsService.addProjectImage(projectId, payload, actor);
      res.status(201).json({ data: row });
    } catch (err) { next(err); }
  }

  static async update(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const payload = req.body || {};
      const row = await ProjectsService.updateProjectImage(id, payload, actor);
      res.json({ data: row });
    } catch (err) { next(err); }
  }

  static async delete(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const result = await ProjectsService.deleteProjectImage(id, actor);
      res.json({ data: result });
    } catch (err) { next(err); }
  }
}

module.exports = ProjectImagesController;
