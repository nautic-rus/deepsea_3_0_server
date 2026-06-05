const Specification = require('../../db/models/Specification');
const SpecificationVersion = require('../../db/models/SpecificationVersion');
const SpecificationDataConnector = require('../../db/models/SpecificationDataConnector');
const SpecificationProjectConnector = require('../../db/models/SpecificationProjectConnector');
const SpecificationSourceConnector = require('../../db/models/SpecificationSourceConnector');
const { hasPermission } = require('./permissionChecker');

/**
 * SpecificationsService
 *
 * Service layer for specification management. Enforces permissions and
 * forwards operations to the Specification model.
 */
class SpecificationsService {
  static _toIntOrNull(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    if (!Number.isInteger(n)) {
      const err = new Error('Invalid connector id');
      err.statusCode = 400;
      throw err;
    }
    return n;
  }

  static _toTextOrNull(value) {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    return text ? text : null;
  }

  static _toNullableInteger(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    if (!Number.isInteger(n)) {
      const err = new Error('Invalid integer value');
      err.statusCode = 400;
      throw err;
    }
    return n;
  }

  static async listSpecifications(query = {}, actor) {
    const requiredPermission = 'specifications.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission specifications.view'); err.statusCode = 403; throw err; }
    return await Specification.list(query);
  }

  static async getSpecificationById(id, actor) {
    const requiredPermission = 'specifications.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission specifications.view'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const s = await Specification.findById(Number(id));
    if (!s) { const err = new Error('Specification not found'); err.statusCode = 404; throw err; }
    const versions = await SpecificationVersion.list({ specification_id: Number(id), limit: 1000 });
    // attach versions array to returned object
    s.versions = versions.map(v => ({
      id: v.id,
      specification_id: v.specification_id,
      version: v.version,
      created_at: v.created_at,
      updated_at: v.updated_at
    }));
    return s;
  }

  static async getSpecificationConnectorsById(id, actor) {
    const requiredPermission = 'specifications.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission specifications.view'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }

    const spec = await Specification.findById(Number(id));
    if (!spec) { const err = new Error('Specification not found'); err.statusCode = 404; throw err; }

    const rows = await SpecificationDataConnector.listBySpecificationId(Number(id));
    return rows.map((row) => ({
      data_connector: row.data_connector,
      source_connector: row.source_connector,
      project_connector: row.project_connector
    }));
  }

  static async upsertSpecificationConnectors(id, fields = {}, actor) {
    const requiredPermission = 'specifications.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission specifications.create'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }

    const spec = await Specification.findById(Number(id));
    if (!spec) { const err = new Error('Specification not found'); err.statusCode = 404; throw err; }

    const payload = {
      specifications_source_connector_id: SpecificationsService._toIntOrNull(fields.specifications_source_connector_id ?? fields.source_connector_id ?? null),
      specifications_project_connector_id: SpecificationsService._toIntOrNull(fields.specifications_project_connector_id ?? fields.project_connector_id ?? null),
      oid: SpecificationsService._toTextOrNull(fields.oid ?? null),
      oid_name: SpecificationsService._toTextOrNull(fields.oid_name ?? null)
    };

    const hasAnyField = Object.values(payload).some((value) => value !== null && value !== undefined && String(value).trim() !== '');
    if (!hasAnyField) {
      const err = new Error('Missing required fields');
      err.statusCode = 400;
      throw err;
    }

    const row = await SpecificationDataConnector.create(Number(id), payload);
    if (!row) { const err = new Error('Specification connectors not found'); err.statusCode = 404; throw err; }
    return {
      data_connector: row.data_connector,
      source_connector: row.source_connector,
      project_connector: row.project_connector
    };
  }

  static async updateSpecificationConnectors(id, fields = {}, actor) {
    const requiredPermission = 'specifications.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission specifications.create'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }

    const spec = await Specification.findById(Number(id));
    if (!spec) { const err = new Error('Specification not found'); err.statusCode = 404; throw err; }

    const payload = {};
    if (Object.prototype.hasOwnProperty.call(fields, 'specifications_source_connector_id') || Object.prototype.hasOwnProperty.call(fields, 'source_connector_id')) {
      payload.specifications_source_connector_id = SpecificationsService._toIntOrNull(fields.specifications_source_connector_id ?? fields.source_connector_id ?? null);
    }
    if (Object.prototype.hasOwnProperty.call(fields, 'specifications_project_connector_id') || Object.prototype.hasOwnProperty.call(fields, 'project_connector_id')) {
      payload.specifications_project_connector_id = SpecificationsService._toIntOrNull(fields.specifications_project_connector_id ?? fields.project_connector_id ?? null);
    }
    if (Object.prototype.hasOwnProperty.call(fields, 'oid')) {
      payload.oid = SpecificationsService._toTextOrNull(fields.oid ?? null);
    }
    if (Object.prototype.hasOwnProperty.call(fields, 'oid_name')) {
      payload.oid_name = SpecificationsService._toTextOrNull(fields.oid_name ?? null);
    }

    const row = await SpecificationDataConnector.updateBySpecificationId(Number(id), payload);
    if (!row) { const err = new Error('Specification connectors not found'); err.statusCode = 404; throw err; }
    return {
      data_connector: row.data_connector,
      source_connector: row.source_connector,
      project_connector: row.project_connector
    };
  }

  static async deleteSpecificationConnectors(id, actor) {
    const requiredPermission = 'specifications.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission specifications.create'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }

    const spec = await Specification.findById(Number(id));
    if (!spec) { const err = new Error('Specification not found'); err.statusCode = 404; throw err; }

    const ok = await SpecificationDataConnector.deleteBySpecificationId(Number(id));
    if (!ok) { const err = new Error('Specification connectors not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }

  static async deleteSpecificationConnector(id, connectorId, actor) {
    const requiredPermission = 'specifications.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission specifications.create'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    if (!connectorId || Number.isNaN(Number(connectorId))) { const err = new Error('Invalid connector id'); err.statusCode = 400; throw err; }

    const spec = await Specification.findById(Number(id));
    if (!spec) { const err = new Error('Specification not found'); err.statusCode = 404; throw err; }

    const ok = await SpecificationDataConnector.deleteByIdAndSpecificationId(Number(id), Number(connectorId));
    if (!ok) { const err = new Error('Specification connector not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }

  static async getSpecificationProjectConnectorById(id, actor) {
    const requiredPermission = 'specifications.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission specifications.view'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }

    const row = await SpecificationProjectConnector.findById(Number(id));
    if (!row) { const err = new Error('Specification project connector not found'); err.statusCode = 404; throw err; }
    return row;
  }

  static async upsertSpecificationProjectConnector(fields = {}, actor) {
    const requiredPermission = 'specifications.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission specifications.create'); err.statusCode = 403; throw err; }

    const payload = {
      project_code: SpecificationsService._toTextOrNull(fields.project_code ?? null),
      source: SpecificationsService._toTextOrNull(fields.source ?? null)
    };

    if (!payload.project_code) {
      const err = new Error('Missing required fields');
      err.statusCode = 400;
      throw err;
    }

    const row = await SpecificationProjectConnector.create(payload);
    if (!row) { const err = new Error('Specification project connector not found'); err.statusCode = 404; throw err; }
    return row;
  }

  static async updateSpecificationProjectConnector(id, fields = {}, actor) {
    const requiredPermission = 'specifications.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission specifications.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }

    const payload = {};
    if (Object.prototype.hasOwnProperty.call(fields, 'project_code')) {
      payload.project_code = SpecificationsService._toTextOrNull(fields.project_code ?? null);
      if (!payload.project_code) {
        const err = new Error('Invalid project_code');
        err.statusCode = 400;
        throw err;
      }
    }
    if (Object.prototype.hasOwnProperty.call(fields, 'source')) {
      payload.source = SpecificationsService._toTextOrNull(fields.source ?? null);
    }

    const row = await SpecificationProjectConnector.updateById(Number(id), payload);
    if (!row) { const err = new Error('Specification project connector not found'); err.statusCode = 404; throw err; }
    return row;
  }

  static async deleteSpecificationProjectConnector(id, actor) {
    const requiredPermission = 'specifications.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission specifications.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }

    const ok = await SpecificationProjectConnector.deleteById(Number(id));
    if (!ok) { const err = new Error('Specification project connector not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }

  static async listSpecificationSourceConnectors(actor) {
    const requiredPermission = 'specifications.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission specifications.create'); err.statusCode = 403; throw err; }
    return await SpecificationSourceConnector.listAll();
  }

  static async listSpecificationProjectConnectors(actor) {
    const requiredPermission = 'specifications.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission specifications.view'); err.statusCode = 403; throw err; }
    return await SpecificationProjectConnector.listAll();
  }

  static async createSpecification(fields, actor) {
    const requiredPermission = 'specifications.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission specifications.create'); err.statusCode = 403; throw err; }
    if (!fields || !fields.project_id || !fields.name) { const err = new Error('Missing required fields'); err.statusCode = 400; throw err; }
    if (!fields.created_by) fields.created_by = actor.id;
    const payload = {
      ...fields,
      specialization_id: SpecificationsService._toNullableInteger(fields.specialization_id)
    };
    return await Specification.create(payload);
  }

  static async updateSpecification(id, fields, actor) {
    const requiredPermission = 'specifications.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission specifications.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const payload = { ...fields };
    if (Object.prototype.hasOwnProperty.call(fields, 'specialization_id')) {
      payload.specialization_id = SpecificationsService._toNullableInteger(fields.specialization_id);
    }
    const updated = await Specification.update(Number(id), payload);
    if (!updated) { const err = new Error('Specification not found'); err.statusCode = 404; throw err; }
    return updated;
  }

  static async deleteSpecification(id, actor) {
    const requiredPermission = 'specifications.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission specifications.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }

    const hasLinkedParts = await SpecificationVersion.hasAnyPartsBySpecificationId(Number(id));
    if (hasLinkedParts) {
      const err = new Error('Cannot delete specification: linked version contains parts');
      err.statusCode = 409;
      throw err;
    }

    const ok = await Specification.softDelete(Number(id));
    if (!ok) { const err = new Error('Specification not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }
}

module.exports = SpecificationsService;
