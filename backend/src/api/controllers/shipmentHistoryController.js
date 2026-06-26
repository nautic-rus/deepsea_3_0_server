const ShipmentsService = require('../services/shipmentsService');

class ShipmentHistoryController {
  static async list(req, res, next) {
    try {
      const actor = req.user;
      const shipmentId = Number(req.params.id);
      if (!shipmentId || Number.isNaN(shipmentId)) { const err = new Error('Invalid shipment id'); err.statusCode = 400; throw err; }
      const rows = await ShipmentsService.listShipmentHistory(shipmentId, actor);
      return res.json(rows);
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = ShipmentHistoryController;
