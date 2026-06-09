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
      const rows = await SpecificationsService.getSpecificationConnectorsById(id, actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  /**
   * Create or replace connector data for a specification.
   */
  static async createConnectors(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const body = req.body || {};
      const payload = {
        specifications_source_connector_id: body.specifications_source_connector_id ?? body.source_connector_id,
        specifications_project_connector_id: body.specifications_project_connector_id ?? body.project_connector_id,
        oid: body.oid,
        oid_name: body.oid_name,
        eq_type: body.eq_type,
        eq_mech: body.eq_mech
      };
      const row = await SpecificationsService.upsertSpecificationConnectors(id, payload, actor);
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
      const body = req.body || {};
      const payload = {};
      if (Object.prototype.hasOwnProperty.call(body, 'specifications_source_connector_id') || Object.prototype.hasOwnProperty.call(body, 'source_connector_id')) {
        payload.specifications_source_connector_id = body.specifications_source_connector_id ?? body.source_connector_id;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'specifications_project_connector_id') || Object.prototype.hasOwnProperty.call(body, 'project_connector_id')) {
        payload.specifications_project_connector_id = body.specifications_project_connector_id ?? body.project_connector_id;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'oid')) {
        payload.oid = body.oid;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'oid_name')) {
        payload.oid_name = body.oid_name;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'eq_type')) {
        payload.eq_type = body.eq_type;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'eq_mech')) {
        payload.eq_mech = body.eq_mech;
      }
      const row = await SpecificationsService.updateSpecificationConnectors(id, payload, actor);
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
      const hasConnectorId = Object.prototype.hasOwnProperty.call(req.params, 'connectorId');
      const connectorId = hasConnectorId ? parseInt(req.params.connectorId, 10) : null;
      if (hasConnectorId) {
        if (!connectorId || Number.isNaN(connectorId)) {
          const err = new Error('Invalid connector id');
          err.statusCode = 400;
          throw err;
        }
        await SpecificationsService.deleteSpecificationConnector(id, connectorId, actor);
        res.json({ message: 'Specification connector deleted' });
        return;
      }
      await SpecificationsService.deleteSpecificationConnectors(id, actor);
      res.json({ message: 'Specification connectors deleted' });
    } catch (err) { next(err); }
  }

  /**
   * Get a project connector by connector id.
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
   * Create or replace a project connector.
   */
  static async createProjectConnector(req, res, next) {
    try {
      const actor = req.user || null;
      const row = await SpecificationsService.upsertSpecificationProjectConnector(req.body || {}, actor);
      res.status(201).json({ data: row });
    } catch (err) { next(err); }
  }

  /**
   * Update a project connector.
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
   * Delete a project connector.
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
   * List all project connectors.
   */
  static async listProjectConnectors(req, res, next) {
    try {
      const actor = req.user || null;
      const rows = await SpecificationsService.listSpecificationProjectConnectors(actor);
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
