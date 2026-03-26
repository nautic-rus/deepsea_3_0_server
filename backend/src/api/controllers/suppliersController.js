const SuppliersService = require('../services/suppliersService');

/**
 * SuppliersController
 *
 * HTTP controller for suppliers CRUD endpoints. Delegates to SuppliersService
 * and returns JSON responses.
 */
class SuppliersController {
  /**
   * List suppliers with optional filters.
   */
  static async list(req, res, next) {
    try {
      const actor = req.user || null;
      const rows = await SuppliersService.listSuppliers(req.query || {}, actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  /**
   * Get supplier by id.
   */
  static async get(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const row = await SuppliersService.getSupplierById(id, actor);
      res.json(row);
    } catch (err) { next(err); }
  }

  /**
   * Create a new supplier.
   */
  static async create(req, res, next) {
    try {
      const actor = req.user || null;
      const created = await SuppliersService.createSupplier(req.body || {}, actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  /**
   * Update a supplier.
   */
  static async update(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const updated = await SuppliersService.updateSupplier(id, req.body || {}, actor);
      res.json({ data: updated });
    } catch (err) { next(err); }
  }

  /**
   * Delete (soft-delete) a supplier.
   */
  static async delete(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      await SuppliersService.deleteSupplier(id, actor);
      res.json({ message: 'Supplier deleted' });
    } catch (err) { next(err); }
  }
}

module.exports = SuppliersController;

