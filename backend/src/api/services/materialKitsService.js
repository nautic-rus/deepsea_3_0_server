const MaterialKit = require('../../db/models/MaterialKit');
const MaterialKitItem = require('../../db/models/MaterialKitItem');
const Material = require('../../db/models/Material');
const SpecificationPart = require('../../db/models/SpecificationPart');
const pool = require('../../db/connection');
const { hasPermission } = require('./permissionChecker');

/**
 * MaterialKitsService
 *
 * Manages material kits and their items. Provides CRUD operations and an
 * "apply kit to specification" helper to expand kit items into specification parts.
 */
class MaterialKitsService {
  static async listKits(query = {}, actor) {
    const requiredPermission = 'material_kits.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission material_kits.view'); err.statusCode = 403; throw err; }
    return await MaterialKit.list(query);
  }

  static async getKitById(id, actor) {
    const requiredPermission = 'material_kits.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission material_kits.view'); err.statusCode = 403; throw err; }
    const k = await MaterialKit.findById(Number(id));
    if (!k) { const err = new Error('Kit not found'); err.statusCode = 404; throw err; }
    return k;
  }

  static async createKit(fields, actor) {
    const requiredPermission = 'material_kits.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission material_kits.create'); err.statusCode = 403; throw err; }
    if (!fields || !fields.name || !fields.code) { const err = new Error('Missing required fields'); err.statusCode = 400; throw err; }
    if (!fields.created_by) fields.created_by = actor.id;
    return await MaterialKit.create(fields);
  }

  static async updateKit(id, fields, actor) {
    const requiredPermission = 'material_kits.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission material_kits.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const updated = await MaterialKit.update(Number(id), fields);
    if (!updated) { const err = new Error('Kit not found'); err.statusCode = 404; throw err; }
    return updated;
  }

  static async deleteKit(id, actor) {
    const requiredPermission = 'material_kits.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission material_kits.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const ok = await MaterialKit.softDelete(Number(id));
    if (!ok) { const err = new Error('Kit not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }

  // Items
  static async listItems(kit_id, actor) {
    const requiredPermission = 'material_kits.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission material_kits.view'); err.statusCode = 403; throw err; }
    return await MaterialKitItem.list({ kit_id });
  }

  static async createItem(kit_id, fields, actor) {
    const requiredPermission = 'material_kits.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission material_kits.update'); err.statusCode = 403; throw err; }
    if (!kit_id || Number.isNaN(Number(kit_id))) { const err = new Error('Invalid kit id'); err.statusCode = 400; throw err; }
    fields.kit_id = Number(kit_id);
    return await MaterialKitItem.create(fields);
  }

  static async updateItem(id, fields, actor) {
    const requiredPermission = 'material_kits.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission material_kits.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const updated = await MaterialKitItem.update(Number(id), fields);
    if (!updated) { const err = new Error('Kit item not found'); err.statusCode = 404; throw err; }
    return updated;
  }

  static async deleteItem(id, actor) {
    const requiredPermission = 'material_kits.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission material_kits.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const ok = await MaterialKitItem.softDelete(Number(id));
    if (!ok) { const err = new Error('Kit item not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }

  // Apply kit to specification version: expand kit items into specification_parts
  static async applyKitToSpecification(specification_version_id, kit_id, actor) {
    const requiredPermission = 'material_kits.apply';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission material_kits.apply'); err.statusCode = 403; throw err; }
    if (!specification_version_id || Number.isNaN(Number(specification_version_id))) { const err = new Error('Invalid specification_version_id'); err.statusCode = 400; throw err; }
    if (!kit_id || Number.isNaN(Number(kit_id))) { const err = new Error('Invalid kit id'); err.statusCode = 400; throw err; }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // load kit items
      const items = await MaterialKitItem.list({ kit_id: Number(kit_id), page: 1, limit: 10000 });
      const insertedIds = [];
      for (const it of items) {
        let material_id = it.material_id || null;
        if (!material_id && it.stock_code) {
          const res = await client.query('SELECT id FROM materials WHERE stock_code = $1 LIMIT 1', [it.stock_code]);
          const m = res.rows[0];
          if (m) material_id = m.id;
        }
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
