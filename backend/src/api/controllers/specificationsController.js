const SpecificationsService = require('../services/specificationsService');

/**
 * SpecificationsController
 *
 * Controller for specification endpoints. Delegates to SpecificationsService
 * and returns standardized JSON responses.
 */
class SpecificationsController {
  /**
   * List specifications for a project or query.
   */
  static async list(req, res, next) {
    try {
      const actor = req.user || null;
      const rows = await SpecificationsService.listSpecifications(req.query || {}, actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  /**
   * Get a specification by id.
   */
  static async get(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const row = await SpecificationsService.getSpecificationById(id, actor);
      res.json(row);
    } catch (err) { next(err); }
  }

  /**
   * Get specification connectors by specification id.
   */
  static async getConnectors(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const row = await SpecificationsService.getSpecificationConnectorsById(id, actor);
      res.json(row);
    } catch (err) { next(err); }
  }

  /**
   * Create or replace connector data for a specification.
   */
  static async createConnectors(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const row = await SpecificationsService.upsertSpecificationConnectors(id, req.body || {}, actor);
      res.status(201).json({ data: row });
    } catch (err) { next(err); }
  }

  /**
   * Update connector data for a specification.
   */
  static async updateConnectors(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const row = await SpecificationsService.updateSpecificationConnectors(id, req.body || {}, actor);
      res.json({ data: row });
    } catch (err) { next(err); }
  }

  /**
   * Delete connector data for a specification.
   */
  static async deleteConnectors(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      await SpecificationsService.deleteSpecificationConnectors(id, actor);
      res.json({ message: 'Specification connectors deleted' });
    } catch (err) { next(err); }
  }

  /**
   * Get project connector for a specification.
   */
  static async getProjectConnector(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const row = await SpecificationsService.getSpecificationProjectConnectorById(id, actor);
      res.json(row);
    } catch (err) { next(err); }
  }

  /**
   * Create or replace project connector for a specification.
   */
  static async createProjectConnector(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const row = await SpecificationsService.upsertSpecificationProjectConnector(id, req.body || {}, actor);
      res.status(201).json({ data: row });
    } catch (err) { next(err); }
  }

  /**
   * Update project connector for a specification.
   */
  static async updateProjectConnector(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const row = await SpecificationsService.updateSpecificationProjectConnector(id, req.body || {}, actor);
      res.json({ data: row });
    } catch (err) { next(err); }
  }

  /**
   * Delete project connector for a specification.
   */
  static async deleteProjectConnector(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      await SpecificationsService.deleteSpecificationProjectConnector(id, actor);
      res.json({ message: 'Specification project connector deleted' });
    } catch (err) { next(err); }
  }

  /**
   * List all source connectors.
   */
  static async listSourceConnectors(req, res, next) {
    try {
      const actor = req.user || null;
      const rows = await SpecificationsService.listSpecificationSourceConnectors(actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  /**
   * Create a new specification.
   */
  static async create(req, res, next) {
    try {
      const actor = req.user || null;
      const created = await SpecificationsService.createSpecification(req.body || {}, actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  /**
   * Update a specification.
   */
  static async update(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const updated = await SpecificationsService.updateSpecification(id, req.body || {}, actor);
      res.json({ data: updated });
    } catch (err) { next(err); }
  }

  /**
   * Delete a specification (soft-delete).
   */
  static async delete(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      await SpecificationsService.deleteSpecification(id, actor);
      res.json({ message: 'Specification deleted' });
    } catch (err) { next(err); }
  }
}

module.exports = SpecificationsController;
