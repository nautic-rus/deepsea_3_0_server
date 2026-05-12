const MaterialProject = require('../../db/models/MaterialProject');
const Material = require('../../db/models/Material');
const Statement = require('../../db/models/Statement');
const Shipment = require('../../db/models/Shipment');
const { hasPermission, hasPermissionForProject } = require('./permissionChecker');

class MaterialsProjectsService {
  static _normalizePayload(fields = {}) {
    return Object.assign({}, fields || {});
  }

  static _toInt(v) {
    if (v === null || typeof v === 'undefined' || v === '') return undefined;
    const n = Number(v);
    return Number.isNaN(n) ? undefined : n;
  }

  static async _ensureWriteAccess(actor, projectId) {
    if (projectId === null || typeof projectId === 'undefined') {
      const allowed = await hasPermission(actor, 'materials.update');
      if (!allowed) {
        const err = new Error('Forbidden: missing permission materials.update');
        err.statusCode = 403;
        throw err;
      }
      return;
    }
    const allowed = await hasPermissionForProject(actor, 'materials.update', Number(projectId));
    if (!allowed) {
      const err = new Error('Forbidden: missing permission materials.update for target project');
      err.statusCode = 403;
      throw err;
    }
  }

  static async create(fields, actor) {
    const requiredPermission = 'materials.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const payload = MaterialsProjectsService._normalizePayload(fields || {});

    const materialId = MaterialsProjectsService._toInt(payload.equipment_material_id);
    const statementId = MaterialsProjectsService._toInt(payload.statement_id);
    const shipmentsId = MaterialsProjectsService._toInt(payload.shipments_id);

    if (!materialId || !statementId) {
      const err = new Error('Missing required fields: equipment_material_id, statement_id');
      err.statusCode = 400;
      throw err;
    }

    const material = await Material.findById(materialId);
    if (!material) { const err = new Error('Material not found'); err.statusCode = 404; throw err; }

    const statement = await Statement.findById(statementId);
    if (!statement) { const err = new Error('Statement not found'); err.statusCode = 404; throw err; }

    if (Object.prototype.hasOwnProperty.call(payload, 'shipments_id') && payload.shipments_id !== null && shipmentsId === undefined) {
      const err = new Error('Invalid shipments_id');
      err.statusCode = 400;
      throw err;
    }

    const resolvedProjectId = Number(statement.project_id) || null;

    await MaterialsProjectsService._ensureWriteAccess(actor, resolvedProjectId);

    if (shipmentsId !== undefined) {
      const shipment = await Shipment.findById(shipmentsId);
      if (!shipment) { const err = new Error('Shipment not found'); err.statusCode = 404; throw err; }
    }

    return await MaterialProject.create({
      equipment_material_id: materialId,
      statement_id: statementId,
      shipments_id: shipmentsId !== undefined ? shipmentsId : null
    });
  }

  static async update(id, fields, actor) {
    const requiredPermission = 'materials.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }

    const existing = await MaterialProject.findById(Number(id));
    if (!existing) { const err = new Error('Material-project link not found'); err.statusCode = 404; throw err; }

    const payload = MaterialsProjectsService._normalizePayload(fields || {});
    const materialProvided = Object.prototype.hasOwnProperty.call(payload, 'equipment_material_id');
    const statementProvided = Object.prototype.hasOwnProperty.call(payload, 'statement_id');
    const shipmentsProvided = Object.prototype.hasOwnProperty.call(payload, 'shipments_id');

    const nextMaterialId = materialProvided ? MaterialsProjectsService._toInt(payload.equipment_material_id) : existing.equipment_material_id;
    const nextStatementId = statementProvided ? MaterialsProjectsService._toInt(payload.statement_id) : existing.statement_id;
    const nextShipmentsId = shipmentsProvided
      ? (payload.shipments_id === null ? null : MaterialsProjectsService._toInt(payload.shipments_id))
      : existing.shipments_id;

    if (materialProvided && nextMaterialId === undefined) {
      const err = new Error('Invalid equipment_material_id');
      err.statusCode = 400;
      throw err;
    }
    if (statementProvided && nextStatementId === undefined) {
      const err = new Error('Invalid statement_id');
      err.statusCode = 400;
      throw err;
    }
    if (!nextMaterialId || !nextStatementId) {
      const err = new Error('Missing required fields: equipment_material_id, statement_id');
      err.statusCode = 400;
      throw err;
    }

    if (shipmentsProvided && payload.shipments_id !== null && nextShipmentsId === undefined) {
      const err = new Error('Invalid shipments_id');
      err.statusCode = 400;
      throw err;
    }

    const material = await Material.findById(nextMaterialId);
    if (!material) { const err = new Error('Material not found'); err.statusCode = 404; throw err; }

    const statement = await Statement.findById(nextStatementId);
    if (!statement) { const err = new Error('Statement not found'); err.statusCode = 404; throw err; }

    const resolvedProjectId = Number(statement.project_id) || null;

    const existingAllowed = existing.project_id !== null ? existing.project_id : resolvedProjectId;
    await MaterialsProjectsService._ensureWriteAccess(actor, existingAllowed);
    if (resolvedProjectId !== null && existingAllowed !== null && Number(existingAllowed) !== Number(resolvedProjectId)) {
      await MaterialsProjectsService._ensureWriteAccess(actor, resolvedProjectId);
    }

    if (payload.shipments_id !== undefined && nextShipmentsId !== undefined) {
      const shipment = await Shipment.findById(nextShipmentsId);
      if (!shipment) { const err = new Error('Shipment not found'); err.statusCode = 404; throw err; }
    }

    return await MaterialProject.update(Number(id), {
      equipment_material_id: nextMaterialId,
      statement_id: nextStatementId,
      shipments_id: nextShipmentsId
    });
  }

  static async delete(id, actor) {
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }

    const existing = await MaterialProject.findById(Number(id));
    if (!existing) { const err = new Error('Material-project link not found'); err.statusCode = 404; throw err; }

    await MaterialsProjectsService._ensureWriteAccess(actor, existing.project_id);

    const ok = await MaterialProject.remove(Number(id));
    if (!ok) { const err = new Error('Material-project link not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }
}

module.exports = MaterialsProjectsService;
