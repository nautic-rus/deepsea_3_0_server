const Material = require('../../db/models/Material');
const pool = require('../../db/connection');
const { hasPermission } = require('./permissionChecker');

/**
 * MaterialsService
 *
 * Provides operations for managing materials, including stock code
 * generation and basic CRUD. Applies permission checks before DB actions.
 */
class MaterialsService {
  static async listMaterials(query = {}, actor) {
    const requiredPermission = 'materials.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission materials.view'); err.statusCode = 403; throw err; }
    return await Material.list(query);
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
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission materials.create'); err.statusCode = 403; throw err; }
    if (!fields || !fields.name) { const err = new Error('Missing required fields'); err.statusCode = 400; throw err; }
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
    // sync shipments and statements if provided
    if (fields.shipments && Array.isArray(fields.shipments)) {
      await MaterialsService._syncShipments(materialId, fields.shipments);
    }
    if (fields.statements && Array.isArray(fields.statements)) {
      await MaterialsService._syncStatements(materialId, fields.statements);
    }

    return created;
  }

  static async updateMaterial(id, fields, actor) {
    const requiredPermission = 'materials.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission materials.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const updated = await Material.update(Number(id), fields);
    if (!updated) { const err = new Error('Material not found'); err.statusCode = 404; throw err; }

    // sync shipments and statements if provided (replace existing links)
    if (fields.shipments && Array.isArray(fields.shipments)) {
      await MaterialsService._syncShipments(Number(id), fields.shipments);
    }
    if (fields.statements && Array.isArray(fields.statements)) {
      await MaterialsService._syncStatements(Number(id), fields.statements);
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

  static async _syncStatements(materialId, statements) {
    // statements: array of ids OR array of objects { statement_id | id }
    if (!materialId) return;
    await pool.query('DELETE FROM statement_materials WHERE material_id = $1', [materialId]);
    const insertQ = 'INSERT INTO statement_materials (statement_id, material_id) VALUES ($1,$2)';
    for (const s of statements) {
      let sid = null;
      if (s && typeof s === 'object') sid = s.statement_id || s.id || null;
      else if (s !== null && s !== undefined) sid = Number(s);
      if (!sid || Number.isNaN(Number(sid))) continue;
      await pool.query(insertQ, [sid, materialId]);
    }
  }

  static async deleteMaterial(id, actor) {
    const requiredPermission = 'materials.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission materials.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
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
