const MaterialKit = require('../../db/models/MaterialKit');
const MaterialKitItem = require('../../db/models/MaterialKitItem');
const Project = require('../../db/models/Project');
const Material = require('../../db/models/Material');
const SpecificationPart = require('../../db/models/SpecificationPart');
const Specification = require('../../db/models/Specification');
const SpecificationVersion = require('../../db/models/SpecificationVersion');
const pool = require('../../db/connection');
const { hasPermission, hasPermissionForProject, getPermissionProjectScope } = require('./permissionChecker');

/**
 * MaterialKitsService
 *
 * Manages material kits and their items. Provides CRUD operations and an
 * "apply kit to specification" helper to expand kit items into specification parts.
 */
class MaterialKitsService {
  static _toInt(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }

  static _normalizeProjectFilter(query = {}) {
    const normalized = Object.assign({}, query || {});
    if (normalized.project_id === undefined && normalized.projectId !== undefined) {
      normalized.project_id = normalized.projectId;
    }
    delete normalized.projectId;
    return normalized;
  }

  static async _ensurePermission(actor, permissionCode, projectId = null) {
    if (!actor || !actor.id) {
      const err = new Error('Authentication required');
      err.statusCode = 401;
      throw err;
    }
    const allowed = projectId === null || projectId === undefined
      ? await hasPermission(actor, permissionCode)
      : await hasPermissionForProject(actor, permissionCode, Number(projectId));
    if (!allowed) {
      const err = new Error(projectId === null || projectId === undefined
        ? `Forbidden: missing permission ${permissionCode}`
        : `Forbidden: missing permission ${permissionCode} for target project`);
      err.statusCode = 403;
      throw err;
    }
  }

  static async listKits(query = {}, actor) {
    const requiredPermission = 'material_kits.view';
    query = MaterialKitsService._normalizeProjectFilter(query);
    const permissionScope = await getPermissionProjectScope(actor, requiredPermission);
    if (!permissionScope.hasGlobal && permissionScope.projectIds.length === 0) {
      const err = new Error('Forbidden: missing permission material_kits.view'); err.statusCode = 403; throw err;
    }

    if (query.project_id !== undefined && query.project_id !== null && query.project_id !== '') {
      const requestedProjectIds = Array.isArray(query.project_id)
        ? query.project_id.map((p) => Number(p)).filter((p) => !Number.isNaN(p))
        : [Number(query.project_id)].filter((p) => !Number.isNaN(p));
      if (requestedProjectIds.length === 0) {
        const err = new Error('Invalid project_id'); err.statusCode = 400; throw err;
      }
      if (!permissionScope.hasGlobal) {
        const forbidden = requestedProjectIds.find((pid) => !permissionScope.projectIds.includes(pid));
        if (forbidden !== undefined) {
          const err = new Error('Forbidden: missing permission material_kits.view for requested project'); err.statusCode = 403; throw err;
        }
      }
      query.project_id = requestedProjectIds.length === 1 ? requestedProjectIds[0] : requestedProjectIds;
    } else if (!permissionScope.hasGlobal) {
      query.allowed_project_ids = permissionScope.projectIds;
    }

    return await MaterialKit.list(query);
  }

  static async getKitById(id, actor) {
    const requiredPermission = 'material_kits.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const k = await MaterialKit.findById(Number(id));
    if (!k) { const err = new Error('Kit not found'); err.statusCode = 404; throw err; }
    await MaterialKitsService._ensurePermission(actor, requiredPermission, k.project_id);
    return k;
  }

  static async createKit(fields, actor) {
    const requiredPermission = 'material_kits.create';
    if (!fields || !fields.name || !fields.code) { const err = new Error('Missing required fields'); err.statusCode = 400; throw err; }
    const hasProjectField = Object.prototype.hasOwnProperty.call(fields || {}, 'project_id');
    const projectId = MaterialKitsService._toInt(fields.project_id);
    if (hasProjectField && fields.project_id !== '' && fields.project_id !== undefined && fields.project_id !== null && projectId === null) {
      const err = new Error('Invalid project_id'); err.statusCode = 400; throw err;
    }
    if (projectId !== null) {
      const project = await Project.findById(projectId);
      if (!project) { const err = new Error('Project not found'); err.statusCode = 404; throw err; }
    }
    await MaterialKitsService._ensurePermission(actor, requiredPermission, projectId);
    if (!fields.created_by) fields.created_by = actor.id;
    fields.project_id = projectId;
    return await MaterialKit.create(fields);
  }

  static async updateKit(id, fields, actor) {
    const requiredPermission = 'material_kits.update';
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const existing = await MaterialKit.findById(Number(id));
    if (!existing) { const err = new Error('Kit not found'); err.statusCode = 404; throw err; }
    const projectIdProvided = Object.prototype.hasOwnProperty.call(fields || {}, 'project_id');
    const targetProjectId = projectIdProvided ? MaterialKitsService._toInt(fields.project_id) : existing.project_id;
    if (projectIdProvided && fields.project_id !== '' && fields.project_id !== null && fields.project_id !== undefined && targetProjectId === null) {
      const err = new Error('Invalid project_id'); err.statusCode = 400; throw err;
    }
    if (projectIdProvided && targetProjectId !== null) {
      const project = await Project.findById(targetProjectId);
      if (!project) { const err = new Error('Project not found'); err.statusCode = 404; throw err; }
    }
    if (existing.project_id !== null && existing.project_id !== undefined) {
      await MaterialKitsService._ensurePermission(actor, requiredPermission, existing.project_id);
      if (projectIdProvided && targetProjectId !== null && Number(targetProjectId) !== Number(existing.project_id)) {
        await MaterialKitsService._ensurePermission(actor, requiredPermission, targetProjectId);
      }
    } else {
      await MaterialKitsService._ensurePermission(actor, requiredPermission, targetProjectId);
    }

    if (projectIdProvided) fields.project_id = targetProjectId;
    const updated = await MaterialKit.update(Number(id), fields);
    if (!updated) { const err = new Error('Kit not found'); err.statusCode = 404; throw err; }
    return updated;
  }

  static async deleteKit(id, actor) {
    const requiredPermission = 'material_kits.delete';
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const existing = await MaterialKit.findById(Number(id));
    if (!existing) { const err = new Error('Kit not found'); err.statusCode = 404; throw err; }
    await MaterialKitsService._ensurePermission(actor, requiredPermission, existing.project_id);
    const ok = await MaterialKit.softDelete(Number(id));
    if (!ok) { const err = new Error('Kit not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }

  // Items
  static async listItems(kit_id, actor) {
    const requiredPermission = 'material_kits.view';
    const kit = await MaterialKit.findById(Number(kit_id));
    if (!kit) { const err = new Error('Kit not found'); err.statusCode = 404; throw err; }
    await MaterialKitsService._ensurePermission(actor, requiredPermission, kit.project_id);
    return await MaterialKitItem.list({ kit_id });
  }

  static async createItem(kit_id, fields, actor) {
    const requiredPermission = 'material_kits.update';
    if (!kit_id || Number.isNaN(Number(kit_id))) { const err = new Error('Invalid kit id'); err.statusCode = 400; throw err; }
    const kit = await MaterialKit.findById(Number(kit_id));
    if (!kit) { const err = new Error('Kit not found'); err.statusCode = 404; throw err; }
    await MaterialKitsService._ensurePermission(actor, requiredPermission, kit.project_id);
    fields.kit_id = Number(kit_id);
    return await MaterialKitItem.create(fields);
  }

  static async updateItem(id, fields, actor) {
    const requiredPermission = 'material_kits.update';
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const existing = await MaterialKitItem.findById(Number(id));
    if (!existing) { const err = new Error('Kit item not found'); err.statusCode = 404; throw err; }
    const kit = await MaterialKit.findById(Number(existing.kit_id));
    if (!kit) { const err = new Error('Kit not found'); err.statusCode = 404; throw err; }
    await MaterialKitsService._ensurePermission(actor, requiredPermission, kit.project_id);
    const updated = await MaterialKitItem.update(Number(id), fields);
    if (!updated) { const err = new Error('Kit item not found'); err.statusCode = 404; throw err; }
    return updated;
  }

  static async deleteItem(id, actor) {
    const requiredPermission = 'material_kits.update';
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const existing = await MaterialKitItem.findById(Number(id));
    if (!existing) { const err = new Error('Kit item not found'); err.statusCode = 404; throw err; }
    const kit = await MaterialKit.findById(Number(existing.kit_id));
    if (!kit) { const err = new Error('Kit not found'); err.statusCode = 404; throw err; }
    await MaterialKitsService._ensurePermission(actor, requiredPermission, kit.project_id);
    const ok = await MaterialKitItem.softDelete(Number(id));
    if (!ok) { const err = new Error('Kit item not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }

  // Apply kit to specification version: expand kit items into specification_parts
  static async applyKitToSpecification(specification_version_id, kit_id, actor) {
    const requiredPermission = 'material_kits.apply';
    if (!specification_version_id || Number.isNaN(Number(specification_version_id))) { const err = new Error('Invalid specification_version_id'); err.statusCode = 400; throw err; }
    if (!kit_id || Number.isNaN(Number(kit_id))) { const err = new Error('Invalid kit id'); err.statusCode = 400; throw err; }
    const kit = await MaterialKit.findById(Number(kit_id));
    if (!kit) { const err = new Error('Kit not found'); err.statusCode = 404; throw err; }
    const version = await SpecificationVersion.findById(Number(specification_version_id));
    if (!version) { const err = new Error('Specification version not found'); err.statusCode = 404; throw err; }
    if (version.lock) { const err = new Error('Specification version is locked'); err.statusCode = 423; throw err; }
    const specification = await Specification.findById(Number(version.specification_id));
    if (!specification) { const err = new Error('Specification not found'); err.statusCode = 404; throw err; }
    if (kit.project_id !== null && kit.project_id !== undefined && Number(kit.project_id) !== Number(specification.project_id)) {
      const err = new Error('Forbidden: kit is bound to another project'); err.statusCode = 403; throw err;
    }
    await MaterialKitsService._ensurePermission(actor, requiredPermission, specification.project_id);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // load kit items
      const items = await MaterialKitItem.list({ kit_id: Number(kit_id), page: 1, limit: 10000 });
      const insertedIds = [];
      for (const it of items) {
        const material_id = it.material_id || null;
        const q = `INSERT INTO specification_parts (specification_version_id, part_code, material_id, quantity, created_by, source) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, specification_version_id, part_code, material_id, quantity, source, created_at`;
        const vals = [Number(specification_version_id), it.part_code || null, material_id, it.quantity || 1, actor.id, 'import'];
        const r = await client.query(q, vals);
        if (r.rows && r.rows[0] && r.rows[0].id) insertedIds.push(r.rows[0].id);
      }
      await client.query('COMMIT');
      // return enriched specification_part rows
      const enriched = await Promise.all(insertedIds.map(id => SpecificationPart.findById(id)));
      return enriched;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = MaterialKitsService;
