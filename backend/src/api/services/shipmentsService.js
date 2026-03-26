const Shipment = require('../../db/models/Shipment');
const ShipmentMaterial = require('../../db/models/ShipmentMaterial');
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

  // Items
  static async listItems(shipment_id, actor) {
    const requiredPermission = 'shipments.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission shipments.view'); err.statusCode = 403; throw err; }
    if (!shipment_id || Number.isNaN(Number(shipment_id))) { const err = new Error('Invalid shipment_id'); err.statusCode = 400; throw err; }
    return await ShipmentMaterial.listByShipment(Number(shipment_id));
  }

  static async createItem(shipment_id, fields, actor) {
    const requiredPermission = 'shipments.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission shipments.update'); err.statusCode = 403; throw err; }
    if (!shipment_id || Number.isNaN(Number(shipment_id))) { const err = new Error('Invalid shipment_id'); err.statusCode = 400; throw err; }
    if (!fields || !fields.material_id) { const err = new Error('Missing material_id'); err.statusCode = 400; throw err; }
    fields.shipment_id = Number(shipment_id);
    return await ShipmentMaterial.create(fields);
  }

  static async updateItem(id, fields, actor) {
    const requiredPermission = 'shipments.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission shipments.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const updated = await ShipmentMaterial.update(Number(id), fields);
    if (!updated) { const err = new Error('Item not found'); err.statusCode = 404; throw err; }
    return updated;
  }

  static async deleteItem(id, actor) {
    const requiredPermission = 'shipments.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission shipments.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const ok = await ShipmentMaterial.delete(Number(id));
    if (!ok) { const err = new Error('Item not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }
}

module.exports = ShipmentsService;
