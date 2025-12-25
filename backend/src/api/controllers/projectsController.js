const ProjectsService = require('../services/projectsService');

class ProjectsController {
  static async list(req, res, next) {
    try {
      const actor = req.user || null;
      const result = await ProjectsService.listProjects(req.query || {}, actor);
      res.json({ data: result });
    } catch (err) { next(err); }
  }

  static async get(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const row = await ProjectsService.getProjectById(id, actor);
      res.json(row);
    } catch (err) { next(err); }
  }

  static async create(req, res, next) {
    try {
      const actor = req.user || null;
      const created = await ProjectsService.createProject(req.body || {}, actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  static async update(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const updated = await ProjectsService.updateProject(id, req.body || {}, actor);
      res.json({ data: updated });
    } catch (err) { next(err); }
  }

  static async delete(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      await ProjectsService.deleteProject(id, actor);
      res.json({ message: 'Project deleted' });
    } catch (err) { next(err); }
  }
}

module.exports = ProjectsController;

