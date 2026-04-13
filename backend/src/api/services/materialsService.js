const Material = require('../../db/models/Material');
const pool = require('../../db/connection');
const { hasPermission, hasPermissionForProject, getPermissionProjectScope } = require('./permissionChecker');

/**
 * MaterialsService
 *
 * Provides operations for managing materials, including stock code
 * generation and basic CRUD. Applies permission checks before DB actions.
 */
class MaterialsService {
  static async _listLinkedProjectIds(materialId) {
    const q = `
      SELECT DISTINCT s.project_id
      FROM equipment_materials_projects emp
      JOIN statements s ON s.id = emp.statement_id
      WHERE emp.equipment_material_id = $1
        AND s.project_id IS NOT NULL
    `;
    const res = await pool.query(q, [Number(materialId)]);
    return (res.rows || []).map(r => Number(r.project_id)).filter(n => !Number.isNaN(n));
  }

  static async listMaterials(query = {}, actor) {
    const requiredPermission = 'materials.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const permissionScope = await getPermissionProjectScope(actor, requiredPermission);
    if (!permissionScope.hasGlobal && permissionScope.projectIds.length === 0) {
      const err = new Error('Forbidden: missing permission materials.view'); err.statusCode = 403; throw err;
    }

    if (permissionScope.hasGlobal) {
      return await Material.list(query);
    }

    const allowedProjectIds = permissionScope.projectIds;
    if (query.project_id !== undefined && query.project_id !== null) {
      const requestedProjectIds = Array.isArray(query.project_id)
        ? query.project_id.map(p => Number(p)).filter(p => !Number.isNaN(p))
        : [Number(query.project_id)].filter(p => !Number.isNaN(p));

      if (requestedProjectIds.length === 0) {
        const err = new Error('Invalid project_id'); err.statusCode = 400; throw err;
      }

      const forbiddenProject = requestedProjectIds.find(pid => !allowedProjectIds.includes(pid));
      if (forbiddenProject !== undefined) {
        const err = new Error('Forbidden: missing permission materials.view for requested project'); err.statusCode = 403; throw err;
      }

      query.project_id = requestedProjectIds.length === 1 ? requestedProjectIds[0] : requestedProjectIds;
    }

    const filters = Object.assign({}, query, { allowed_project_ids: allowedProjectIds });
    return await Material.list(filters);
  }

  static async getMaterialById(id, actor) {
    const requiredPermission = 'materials.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission materials.view'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const m = await Material.findById(Number(id));
    if (!m) { const err = new Error('Material not found'); err.statusCode = 404; throw err; }
    return m;
  }

  static async createMaterial(fields, actor) {
    const requiredPermission = 'materials.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    if (!fields || !fields.name || !fields.directory_id) { const err = new Error('Missing required fields: name, directory_id'); err.statusCode = 400; throw err; }
    const targetProjectId = fields.project_id !== undefined && fields.project_id !== null ? Number(fields.project_id) : null;
    const allowed = targetProjectId
      ? await hasPermissionForProject(actor, requiredPermission, targetProjectId)
      : await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission materials.create'); err.statusCode = 403; throw err; }
    if (!fields.created_by) fields.created_by = actor.id;

    const maxAttempts = 5;
    // ensure stock_code exists; generate if missing
    if (!fields.stock_code) fields.stock_code = await this.nextStockCode(actor);

    let created;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        created = await Material.create(fields);
        break;
      } catch (err) {
        // handle unique violation on stock_code (Postgres code 23505)
        if (err && err.code === '23505' && attempt < maxAttempts - 1) {
          // regenerate stock_code and retry
          fields.stock_code = await this.nextStockCode(actor);
          continue;
        }
        throw err;
      }
    }
    if (!created) { const err = new Error('Unable to create material due to stock_code collisions'); err.statusCode = 500; throw err; }

    const materialId = created.id;
    // sync shipments if provided
    if (fields.shipments && Array.isArray(fields.shipments)) {
      await MaterialsService._syncShipments(materialId, fields.shipments);
    }

    return created;
  }

  static async updateMaterial(id, fields, actor) {
    const requiredPermission = 'materials.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const existing = await Material.findById(Number(id));
    if (!existing) { const err = new Error('Material not found'); err.statusCode = 404; throw err; }
    const linkedProjectIds = await MaterialsService._listLinkedProjectIds(Number(id));
    if (linkedProjectIds.length > 0) {
      for (const projectId of linkedProjectIds) {
        const allowedInProject = await hasPermissionForProject(actor, requiredPermission, projectId);
        if (!allowedInProject) { const err = new Error('Forbidden: missing permission materials.update for one or more linked projects'); err.statusCode = 403; throw err; }
      }
    } else {
      const allowed = await hasPermission(actor, requiredPermission);
      if (!allowed) { const err = new Error('Forbidden: missing permission materials.update'); err.statusCode = 403; throw err; }
    }
    const updated = await Material.update(Number(id), fields);
    if (!updated) { const err = new Error('Material not found'); err.statusCode = 404; throw err; }

    // sync shipments if provided (replace existing links)
    if (fields.shipments && Array.isArray(fields.shipments)) {
      await MaterialsService._syncShipments(Number(id), fields.shipments);
    }

    return updated;
  }

  // helpers for syncing many-to-many relations
  static async _syncShipments(materialId, shipments) {
    // shipments: array of ids OR array of objects { shipment_id | id }
    if (!materialId) return;
    // remove existing links for this material
    await pool.query('DELETE FROM shipment_materials WHERE material_id = $1', [materialId]);
    const insertQ = 'INSERT INTO shipment_materials (shipment_id, material_id) VALUES ($1,$2)';
    for (const s of shipments) {
      let sid = null;
      if (s && typeof s === 'object') sid = s.shipment_id || s.id || null;
      else if (s !== null && s !== undefined) sid = Number(s);
      if (!sid || Number.isNaN(Number(sid))) continue;
      await pool.query(insertQ, [sid, materialId]);
    }
  }

  static async deleteMaterial(id, actor) {
    const requiredPermission = 'materials.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const existing = await Material.findById(Number(id));
    if (!existing) { const err = new Error('Material not found'); err.statusCode = 404; throw err; }
    const linkedProjectIds = await MaterialsService._listLinkedProjectIds(Number(id));
    if (linkedProjectIds.length > 0) {
      for (const projectId of linkedProjectIds) {
        const allowedInProject = await hasPermissionForProject(actor, requiredPermission, projectId);
        if (!allowedInProject) { const err = new Error('Forbidden: missing permission materials.delete for one or more linked projects'); err.statusCode = 403; throw err; }
      }
    } else {
      const allowed = await hasPermission(actor, requiredPermission);
      if (!allowed) { const err = new Error('Forbidden: missing permission materials.delete'); err.statusCode = 403; throw err; }
    }
    // prevent deletion if material is linked in equipment_materials_projects
    const chk = await pool.query('SELECT 1 FROM equipment_materials_projects WHERE material_id = $1 LIMIT 1', [Number(id)]);
    if (chk && chk.rowCount > 0) {
      const err = new Error('Material is used in projects and cannot be deleted');
      err.statusCode = 400;
      throw err;
    }

    const ok = await Material.softDelete(Number(id));
    if (!ok) { const err = new Error('Material not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }

  static async nextStockCode(actor) {
    const requiredPermission = 'materials.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission materials.view'); err.statusCode = 403; throw err; }

    const q = `
      SELECT LPAD(CAST(COALESCE(MAX(CAST(SUBSTRING(stock_code FROM 3) AS BIGINT)), 0) + 1 AS TEXT), 14, '0') AS next_num
      FROM equipment_materials
      WHERE stock_code ~ '^NR[0-9]{14}$'
    `;
    const res = await pool.query(q);
    const nextNum = (res.rows[0] && res.rows[0].next_num) ? res.rows[0].next_num : '00000000000001';
    return 'NR' + nextNum;
  }
}

module.exports = MaterialsService;
