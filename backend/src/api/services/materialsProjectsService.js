const MaterialProject = require('../../db/models/MaterialProject');
const Material = require('../../db/models/Material');
const Statement = require('../../db/models/Statement');
const Shipment = require('../../db/models/Shipment');
const pool = require('../../db/connection');
const { hasPermission, hasPermissionForProject, getPermissionProjectScope } = require('./permissionChecker');

class MaterialsProjectsService {
  static _normalizeProjectFilter(query = {}) {
    const normalized = Object.assign({}, query || {});
    if (normalized.projectId !== undefined && normalized.project_id === undefined) {
      normalized.project_id = normalized.projectId;
    }
    delete normalized.projectId;
    return normalized;
  }

  static _normalizePayload(fields = {}) {
    return Object.assign({}, fields || {});
  }

  static async listProjectDirectories(query = {}, actor) {
    const requiredPermission = 'materials.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }

    query = MaterialsProjectsService._normalizeProjectFilter(query);
    const permissionScope = await getPermissionProjectScope(actor, requiredPermission);
    if (!permissionScope.hasGlobal && permissionScope.projectIds.length === 0) {
      const err = new Error('Forbidden: missing permission materials.view'); err.statusCode = 403; throw err;
    }

    const where = [];
    const values = [];
    let idx = 1;

    if (query.project_id !== undefined && query.project_id !== null && query.project_id !== '') {
      const requestedProjectIds = MaterialProject._toIntArray(query.project_id);
      if (requestedProjectIds.length === 0) {
        const err = new Error('Invalid project_id'); err.statusCode = 400; throw err;
      }
      if (!permissionScope.hasGlobal) {
        const forbidden = requestedProjectIds.find((pid) => !permissionScope.projectIds.includes(pid));
        if (forbidden !== undefined) {
          const err = new Error('Forbidden: missing permission materials.view for requested project'); err.statusCode = 403; throw err;
        }
      }
      where.push(`s.project_id = ANY($${idx++}::int[])`);
      values.push(requestedProjectIds);
    } else if (!permissionScope.hasGlobal) {
      where.push(`s.project_id = ANY($${idx++}::int[])`);
      values.push(permissionScope.projectIds);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const q = `
      WITH RECURSIVE initial_directories AS (
        SELECT DISTINCT
          md.id,
          md.parent_id
        FROM equipment_materials_projects emp
        JOIN statements s ON s.id = emp.statement_id
        JOIN equipment_materials m ON m.id = emp.equipment_material_id
        JOIN equipment_materials_directories md ON md.id = m.directory_id
        ${whereSql}
      ),
      directory_tree AS (
        SELECT
          md.id,
          md.name,
          md.path,
          md.parent_id,
          md.description,
          md.order_index,
          md.created_by,
          md.updated_by,
          md.created_at,
          md.updated_at,
          0 AS depth
        FROM equipment_materials_directories md
        JOIN initial_directories i ON i.id = md.id

        UNION ALL

        SELECT
          parent.id,
          parent.name,
          parent.path,
          parent.parent_id,
          parent.description,
          parent.order_index,
          parent.created_by,
          parent.updated_by,
          parent.created_at,
          parent.updated_at,
          dt.depth + 1 AS depth
        FROM equipment_materials_directories parent
        JOIN directory_tree dt ON dt.parent_id = parent.id
      )
      SELECT
        directories.id,
        directories.name,
        directories.path,
        directories.parent_id,
        directories.description,
        directories.order_index,
        directories.created_by,
        directories.updated_by,
        directories.created_at,
        directories.updated_at,
        directories.created_by_full_name,
        directories.updated_by_full_name
      FROM (
        SELECT DISTINCT ON (dt.id)
          dt.id,
          dt.name,
          dt.path,
          dt.parent_id,
          dt.description,
          dt.order_index,
          dt.created_by,
          dt.updated_by,
          dt.created_at,
          dt.updated_at,
          concat_ws(' ', cu.last_name, cu.first_name, cu.middle_name) AS created_by_full_name,
          concat_ws(' ', uu.last_name, uu.first_name, uu.middle_name) AS updated_by_full_name
        FROM directory_tree dt
        LEFT JOIN users cu ON cu.id = dt.created_by
        LEFT JOIN users uu ON uu.id = dt.updated_by
        ORDER BY dt.id, depth ASC
      ) directories
      ORDER BY directories.path NULLS FIRST, directories.order_index NULLS LAST, directories.name, directories.id
    `;
    const res = await pool.query(q, values);
    return res.rows || [];
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
