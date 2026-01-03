const MaterialKit = require('../../db/models/MaterialKit');
const MaterialKitItem = require('../../db/models/MaterialKitItem');
const Material = require('../../db/models/Material');
const pool = require('../../db/connection');
const { hasPermission } = require('./permissionChecker');

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
      const inserted = [];
      for (const it of items) {
        let stock_code = it.stock_code;
        let name = null;
        let description = null;
        if (it.material_id) {
          const m = await Material.findById(it.material_id);
          if (m) { stock_code = stock_code || m.stock_code; name = m.name; description = m.description; }
        } else if (stock_code) {
          const res = await client.query('SELECT id, stock_code, name, description FROM materials WHERE stock_code = $1 LIMIT 1', [stock_code]);
          const m = res.rows[0];
          if (m) { name = m.name; description = m.description; }
        }
        if (!name) name = it.notes || 'Kit item';
        const q = `INSERT INTO specification_parts (specification_version_id, part_code, stock_code, name, description, quantity, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, specification_version_id, part_code, stock_code, name, description, quantity, created_at`;
        const vals = [Number(specification_version_id), it.part_code || null, stock_code || null, name, description || null, it.quantity || 1, actor.id];
        const r = await client.query(q, vals);
        inserted.push(r.rows[0]);
      }
      await client.query('COMMIT');
      return inserted;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = MaterialKitsService;
