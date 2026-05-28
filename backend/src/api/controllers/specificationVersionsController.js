const Specification = require('../../db/models/Specification');
const SpecificationVersion = require('../../db/models/SpecificationVersion');
const { hasPermission } = require('../services/permissionChecker');
const SpecificationPartsService = require('../services/specificationPartsService');
const SpecificationPartsImportService = require('../services/specificationPartsImportService');
const SpecificationPdfService = require('../services/specificationPdfService');

class SpecificationVersionsController {
  static async list(req, res, next) {
    try {
      const actor = req.user || null;
      const allowed = await hasPermission(actor, 'specifications.view');
      if (!allowed) {
        const err = new Error('Forbidden: missing permission specifications.view');
        err.statusCode = 403;
        throw err;
      }
      const rows = await SpecificationVersion.list(req.query || {});
      res.json({ data: rows });
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    try {
      const actor = req.user || null;
      if (!actor || !actor.id) {
        const err = new Error('Authentication required');
        err.statusCode = 401;
        throw err;
      }

      const allowed = await hasPermission(actor, 'specifications.update');
      if (!allowed) {
        const err = new Error('Forbidden: missing permission specifications.update');
        err.statusCode = 403;
        throw err;
      }

      const specificationId = Number(req.body?.specification_id);
      if (!specificationId || Number.isNaN(specificationId)) {
        const err = new Error('Invalid specification_id');
        err.statusCode = 400;
        throw err;
      }

      const specification = await Specification.findById(specificationId);
      if (!specification) {
        const err = new Error('Specification not found');
        err.statusCode = 404;
        throw err;
      }

      const version = req.body?.version === undefined || req.body?.version === null
        ? null
        : String(req.body.version).trim() || null;
      const notes = req.body?.notes === undefined || req.body?.notes === null
        ? null
        : String(req.body.notes).trim() || null;

      const created = await SpecificationVersion.create({
        specification_id: specificationId,
        version,
        notes,
        created_by: actor.id,
        updated_by: actor.id
      });
      const row = created?.id ? await SpecificationVersion.findById(created.id) : created;
      res.status(201).json({ data: row });
    } catch (err) {
      next(err);
    }
  }

  static async get(req, res, next) {
    try {
      const actor = req.user || null;
      const allowed = await hasPermission(actor, 'specifications.view');
      if (!allowed) {
        const err = new Error('Forbidden: missing permission specifications.view');
        err.statusCode = 403;
        throw err;
      }
      const id = Number(req.params.id);
      if (!id || Number.isNaN(id)) {
        const err = new Error('Invalid id');
        err.statusCode = 400;
        throw err;
      }
      const row = await SpecificationVersion.findById(id);
      if (!row) {
        const err = new Error('Specification version not found');
        err.statusCode = 404;
        throw err;
      }
      res.json({ data: row });
    } catch (err) {
      next(err);
    }
  }

  static async importParts(req, res, next) {
    try {
      const actor = req.user || null;
      const id = Number(req.params.id);
      const requestBaseUrl = `${req.protocol}://${req.get('host')}`;
      const result = await SpecificationPartsImportService.importFromBlocks(id, req.body || null, actor, {
        requestBaseUrl
      });
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  }

  static async downloadPdf(req, res, next) {
    try {
      const actor = req.user || null;
      const id = Number(req.params.id);
      const result = await SpecificationPdfService.generateBySpecificationVersionId(id, actor);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', String(result.buffer.length));
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="specification.pdf"; filename*=UTF-8''${encodeURIComponent(result.filename)}`
      );
      res.status(200).end(result.buffer);
    } catch (err) {
      next(err);
    }
  }

  static async centerOfMass(req, res, next) {
    try {
      const actor = req.user || null;
      const id = Number(req.params.id);
      const result = await SpecificationPartsService.calculateCenterOfMassBySpecificationVersionId(id, actor);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  }

  static async delete(req, res, next) {
    try {
      const actor = req.user || null;
      const allowed = await hasPermission(actor, 'specifications.update');
      if (!allowed) {
        const err = new Error('Forbidden: missing permission specifications.update');
        err.statusCode = 403;
        throw err;
      }

      const id = Number(req.params.id);
      if (!id || Number.isNaN(id)) {
        const err = new Error('Invalid id');
        err.statusCode = 400;
        throw err;
      }

      const deleted = await SpecificationVersion.delete(id);
      if (!deleted) {
        const err = new Error('Specification version not found');
        err.statusCode = 404;
        throw err;
      }

      res.json({ message: 'Deleted' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = SpecificationVersionsController;
