const Shipment = require('../../db/models/Shipment');
const ShipmentMaterial = require('../../db/models/ShipmentMaterial');
const ShipmentStorage = require('../../db/models/ShipmentStorage');
const Storage = require('../../db/models/Storage');
const ShipmentMessage = require('../../db/models/ShipmentMessage');
const HistoryService = require('./historyService');
const { hasPermission } = require('./permissionChecker');

class ShipmentsService {
  static async listShipments(query = {}, actor) {
    const requiredPermission = 'shipments.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission shipments.view'); err.statusCode = 403; throw err; }
    return await Shipment.list(query);
  }

  static async getShipmentById(id, actor) {
    const requiredPermission = 'shipments.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission shipments.view'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const s = await Shipment.findById(Number(id));
    if (!s) { const err = new Error('Shipment not found'); err.statusCode = 404; throw err; }
    return s;
  }

  static async createShipment(fields, actor) {
    const requiredPermission = 'shipments.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission shipments.create'); err.statusCode = 403; throw err; }
    if (!fields) { const err = new Error('Missing fields'); err.statusCode = 400; throw err; }
    if (!fields.created_by) fields.created_by = actor.id;
    const created = await Shipment.create(fields);
    (async () => {
      try {
        await HistoryService.addShipmentHistory(Number(created.id), actor, 'created', { before: null, after: created });
      } catch (e) {
        console.error('Failed to write shipment history for creation', e && e.message ? e.message : e);
      }
    })();
    return created;
  }

  static async updateShipment(id, fields, actor) {
    const requiredPermission = 'shipments.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission shipments.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const existing = await Shipment.findById(Number(id));
    if (!existing) { const err = new Error('Shipment not found'); err.statusCode = 404; throw err; }
    const updated = await Shipment.update(Number(id), fields);
    if (!updated) { const err = new Error('Shipment not found'); err.statusCode = 404; throw err; }
    (async () => {
      try {
        await HistoryService.addShipmentHistory(Number(id), actor, 'updated', { before: existing, after: updated });
      } catch (e) {
        console.error('Failed to write shipment history for update', e && e.message ? e.message : e);
      }
    })();
    return updated;
  }

  static async deleteShipment(id, actor) {
    const requiredPermission = 'shipments.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission shipments.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const existing = await Shipment.findById(Number(id));
    if (!existing) { const err = new Error('Shipment not found'); err.statusCode = 404; throw err; }
    const ok = await Shipment.softDelete(Number(id));
    if (!ok) { const err = new Error('Shipment not found'); err.statusCode = 404; throw err; }
    (async () => {
      try {
        const after = Object.assign({}, existing, { is_active: false });
        await HistoryService.addShipmentHistory(Number(id), actor, 'deleted', { before: existing, after });
      } catch (e) {
        console.error('Failed to write shipment history for deletion', e && e.message ? e.message : e);
      }
    })();
    return { success: true };
  }

  static async attachFileToShipment(id, storageId, actor) {
    const requiredPermission = 'shipments.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission shipments.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id)) || !storageId) { const err = new Error('Invalid id/storageId'); err.statusCode = 400; throw err; }

    const existing = await Shipment.findById(Number(id));
    if (!existing) { const err = new Error('Shipment not found'); err.statusCode = 404; throw err; }

    const storageIds = Array.isArray(storageId) ? storageId.map(Number) : [Number(storageId)];
    const storageItems = [];
    for (const sid of storageIds) {
      if (!sid || Number.isNaN(Number(sid))) { const err = new Error('Invalid storage id'); err.statusCode = 400; throw err; }
      const storageItem = await Storage.findById(Number(sid));
      if (!storageItem) { const err = new Error('Storage item not found'); err.statusCode = 404; throw err; }
      storageItems.push(storageItem);
    }

    const attached = [];
    for (const storageItem of storageItems) {
      const row = await ShipmentStorage.attach({ shipment_id: Number(id), storage_id: Number(storageItem.id) });
      if (row) attached.push(row);
      (async () => {
        try {
          await HistoryService.addShipmentHistory(Number(id), actor, 'file_attached', { before: null, after: storageItem.file_name || null });
        } catch (err) {
          console.error('Failed to write shipment history for file attach', err && err.message ? err.message : err);
        }
      })();
    }
    return attached.length === 1 ? attached[0] : attached;
  }

  static async detachFileFromShipment(id, storageId, actor) {
    const requiredPermission = 'shipments.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission shipments.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id)) || !storageId || Number.isNaN(Number(storageId))) { const err = new Error('Invalid id/storageId'); err.statusCode = 400; throw err; }

    const existing = await Shipment.findById(Number(id));
    if (!existing) { const err = new Error('Shipment not found'); err.statusCode = 404; throw err; }

    const detached = await ShipmentStorage.detach({ shipment_id: Number(id), storage_id: Number(storageId) });
    const storageItem = await Storage.findById(Number(storageId));
    (async () => {
      try {
        await HistoryService.addShipmentHistory(Number(id), actor, 'file_detached', { before: storageItem ? storageItem.file_name : null, after: null });
      } catch (err) {
        console.error('Failed to write shipment history for file detach', err && err.message ? err.message : err);
      }
    })();

    (async () => {
      try {
        const StorageService = require('./storageService');
        await StorageService.deleteStorage(Number(storageId), actor);
      } catch (err) {
        console.error('Failed to delete storage after shipment detach', err && err.message ? err.message : err);
      }
    })();

    return detached;
  }

  static async listShipmentFiles(id, opts = {}, actor) {
    const requiredPermission = 'shipments.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission shipments.view'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }

    const existing = await Shipment.findById(Number(id));
    if (!existing) { const err = new Error('Shipment not found'); err.statusCode = 404; throw err; }

    return await ShipmentStorage.listByShipment(Number(id), opts);
  }

  static async addShipmentMessage(id, content, actor, parent_id = null) {
    const viewPermission = 'shipments.view';
    const requiredPermission = 'shipments.messages';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }

    const canView = await hasPermission(actor, viewPermission);
    if (!canView) { const err = new Error('Forbidden: missing permission shipments.view'); err.statusCode = 403; throw err; }

    const existing = await Shipment.findById(Number(id));
    if (!existing) { const err = new Error('Shipment not found'); err.statusCode = 404; throw err; }

    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission shipments.messages'); err.statusCode = 403; throw err; }
    if (!content || String(content).trim().length === 0) { const err = new Error('Empty content'); err.statusCode = 400; throw err; }

    return await ShipmentMessage.create({
      shipment_id: Number(id),
      user_id: actor.id,
      content: String(content),
      parent_id: parent_id ? Number(parent_id) : null
    });
  }

  static async listShipmentMessages(id, opts = {}, actor) {
    const viewPermission = 'shipments.view';
    const requiredPermission = 'shipments.messages';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }

    const canView = await hasPermission(actor, viewPermission);
    if (!canView) { const err = new Error('Forbidden: missing permission shipments.view'); err.statusCode = 403; throw err; }

    const existing = await Shipment.findById(Number(id));
    if (!existing) { const err = new Error('Shipment not found'); err.statusCode = 404; throw err; }

    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission shipments.messages'); err.statusCode = 403; throw err; }

    const messages = await ShipmentMessage.listByShipment(Number(id), opts);
    if (!messages || messages.length === 0) return [];

    const userIds = [...new Set(messages.map(m => m.user_id).filter(Boolean))];
    let usersMap = new Map();
    if (userIds.length) {
      const res = await require('../../db/connection').query(
        'SELECT id, email, phone, avatar_id, first_name, last_name, middle_name, username FROM users WHERE id = ANY($1::int[])',
        [userIds]
      );
      usersMap = new Map((res.rows || []).map(u => [u.id, u]));
    }

    return messages.map(m => {
      const u = usersMap.get(m.user_id) || null;
      const fullName = u ? [u.last_name, u.first_name, u.middle_name].filter(Boolean).join(' ') : null;
      return Object.assign({}, m, {
        user: u ? { id: u.id, full_name: fullName || u.username || u.email, email: u.email, phone: u.phone, avatar_id: u.avatar_id } : null
      });
    });
  }

  static async listShipmentHistory(id, actor) {
    const viewPermission = 'shipments.view';
    const requiredPermission = 'shipments.history';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }

    const canView = await hasPermission(actor, viewPermission);
    if (!canView) { const err = new Error('Forbidden: missing permission shipments.view'); err.statusCode = 403; throw err; }

    const existing = await Shipment.findById(Number(id));
    if (!existing) { const err = new Error('Shipment not found'); err.statusCode = 404; throw err; }

    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission shipments.history'); err.statusCode = 403; throw err; }

    const ShipmentHistory = require('../../db/models/ShipmentHistory');
    const rows = await ShipmentHistory.listByShipment(Number(id));
    if (!rows || rows.length === 0) return [];

    const parseVal = (v) => {
      if (v === null || typeof v === 'undefined') return null;
      try { return JSON.parse(v); } catch (e) { if (/^\d+$/.test(String(v))) return Number(v); return v; }
    };

    const supplierIds = new Set();
    const changedByIds = new Set(rows.map(r => r.changed_by).filter(Boolean));
    const parsed = rows.map(r => Object.assign({}, r, { _old: parseVal(r.old_value), _new: parseVal(r.new_value) }));
    for (const r of parsed) {
      const collect = (v) => {
        if (v === null || typeof v === 'undefined') return;
        if (Array.isArray(v)) return v.forEach(collect);
        if (r.field_name === 'supplier_id') {
          if (typeof v === 'number') supplierIds.add(v);
          if (typeof v === 'string' && /^\d+$/.test(v)) supplierIds.add(Number(v));
        }
      };
      collect(r._old);
      collect(r._new);
    }

    const pool = require('../../db/connection');
    const qUsers = changedByIds.size ? pool.query('SELECT id, email, phone, avatar_id, first_name, last_name, middle_name, username FROM users WHERE id = ANY($1::int[])', [[...changedByIds]]) : Promise.resolve({ rows: [] });
    const qSuppliers = supplierIds.size ? pool.query('SELECT id, name FROM suppliers WHERE id = ANY($1::int[])', [[...supplierIds]]) : Promise.resolve({ rows: [] });
    const [usersRes, suppliersRes] = await Promise.all([qUsers, qSuppliers]);
    const usersMap = new Map((usersRes.rows || []).map(u => [u.id, u]));
    const supplierMap = new Map((suppliersRes.rows || []).map(s => [s.id, s.name]));

    const out = parsed.map(r => {
      const u = usersMap.get(r.changed_by) || null;
      const changedByUser = u ? { id: u.id, full_name: [u.last_name, u.first_name, u.middle_name].filter(Boolean).join(' ') || u.username || u.email, email: u.email, phone: u.phone, avatar_id: u.avatar_id } : null;
      const replace = (v) => {
        if (v === null || typeof v === 'undefined') return null;
        if (Array.isArray(v)) return v.map(replace);
        if (typeof v === 'number') {
          if (r.field_name === 'supplier_id') return supplierMap.get(v) || v;
          return v;
        }
        if (typeof v === 'string' && /^\d+$/.test(v)) return replace(Number(v));
        return v;
      };
      const base = Object.assign({}, r);
      delete base._old;
      delete base._new;
      base.user = changedByUser;
      base.old_value = replace(r._old);
      base.new_value = replace(r._new);
      return base;
    });

    return out;
  }
}

module.exports = ShipmentsService;
