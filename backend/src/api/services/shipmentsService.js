const Shipment = require('../../db/models/Shipment');
const ShipmentMaterial = require('../../db/models/ShipmentMaterial');
const ShipmentStorage = require('../../db/models/ShipmentStorage');
const Storage = require('../../db/models/Storage');
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
    return await Shipment.create(fields);
  }

  static async updateShipment(id, fields, actor) {
    const requiredPermission = 'shipments.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission shipments.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const updated = await Shipment.update(Number(id), fields);
    if (!updated) { const err = new Error('Shipment not found'); err.statusCode = 404; throw err; }
    return updated;
  }

  static async deleteShipment(id, actor) {
    const requiredPermission = 'shipments.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission shipments.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const ok = await Shipment.softDelete(Number(id));
    if (!ok) { const err = new Error('Shipment not found'); err.statusCode = 404; throw err; }
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
}

module.exports = ShipmentsService;
