const ProjectsService = require('../services/projectsService');

/**
 * ProjectsController
 *
 * Controller for project-related HTTP endpoints. Routes requests to the
 * ProjectsService and returns JSON responses.
 */
class ProjectsController {
  /**
   * List projects (may be restricted to assigned projects based on permissions).
   */
  static async list(req, res, next) {
    try {
      const actor = req.user || null;
      const result = await ProjectsService.listProjects(req.query || {}, actor);
      res.json({ data: result });
    } catch (err) { next(err); }
  }

  /**
   * List projects assigned to current authenticated user (no permission checks required).
   */
  static async myProjects(req, res, next) {
    try {
      const actor = req.user || null;
      const result = await ProjectsService.listProjectsForUser(req.query || {}, actor);
      res.json({ data: result });
    } catch (err) { next(err); }
  }

  /**
   * Get project by id.
   */
  static async get(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const row = await ProjectsService.getProjectById(id, actor);
      res.json(row);
    } catch (err) { next(err); }
  }

  /**
   * Create a new project.
   */
  static async create(req, res, next) {
    try {
      const actor = req.user || null;
      const created = await ProjectsService.createProject(req.body || {}, actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  /**
   * Update a project.
   */
  static async update(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const updated = await ProjectsService.updateProject(id, req.body || {}, actor);
      res.json({ data: updated });
    } catch (err) { next(err); }
  }

  /**
   * Delete (soft-delete) a project.
   */
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

