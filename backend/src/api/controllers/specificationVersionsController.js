const Specification = require('../../db/models/Specification');
const SpecificationVersion = require('../../db/models/SpecificationVersion');
const SpecificationPart = require('../../db/models/SpecificationPart');
const pool = require('../../db/connection');
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
      const lock = req.body?.lock === true || req.body?.lock === 'true' || req.body?.lock === 1 || req.body?.lock === '1';
      const migrateManualParts = SpecificationPartsService._toBoolean(req.body?.migrate_manual_parts);

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const latestVersion = migrateManualParts
          ? await SpecificationVersion.findLatestBySpecificationId(specificationId, client)
          : null;

        const created = await SpecificationVersion.create({
          specification_id: specificationId,
          version,
          notes,
          created_by: actor.id,
          updated_by: actor.id,
          lock
        }, client);

        if (migrateManualParts && latestVersion && latestVersion.id) {
          await SpecificationPart.cloneToSpecificationVersion(latestVersion.id, created.id, actor.id, client);
        }

        await client.query('COMMIT');

        const row = created?.id ? await SpecificationVersion.findById(created.id) : created;
        res.status(201).json({ data: row });
      } catch (txErr) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackErr) {}
        throw txErr;
      } finally {
        client.release();
      }
    } catch (err) {
      next(err);
    }
  }

  static async update(req, res, next) {
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

      const id = Number(req.params.id);
      if (!id || Number.isNaN(id)) {
        const err = new Error('Invalid id');
        err.statusCode = 400;
        throw err;
      }

      const version = req.body?.version === undefined || req.body?.version === null
        ? undefined
        : String(req.body.version).trim() || null;
      const notes = req.body?.notes === undefined || req.body?.notes === null
        ? undefined
        : String(req.body.notes).trim() || null;
      const lock = req.body?.lock === undefined
        ? undefined
        : (req.body?.lock === true || req.body?.lock === 'true' || req.body?.lock === 1 || req.body?.lock === '1');

      const updated = await SpecificationVersion.update(id, {
        version,
        notes,
        lock,
        updated_by: actor.id
      });
      if (!updated) {
        const err = new Error('Specification version not found');
        err.statusCode = 404;
        throw err;
      }

      const row = await SpecificationVersion.findById(id);
      res.json({ data: row || updated });
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

  static async compare(req, res, next) {
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

      const compareToRaw = req.query?.compare_to ?? req.query?.compareTo ?? req.query?.compare_version_id ?? req.query?.version_id;
      const compareToId = Number(compareToRaw);
      if (!compareToRaw || Number.isNaN(compareToId)) {
        const err = new Error('Invalid compare_to');
        err.statusCode = 400;
        throw err;
      }

      const result = await SpecificationVersion.compareVersions(id, compareToId);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  }

  static async importParts(req, res, next) {
    try {
      const actor = req.user || null;
      const id = Number(req.params.id);
      const requestBaseUrl = `${req.protocol}://${req.get('host')}`;
      const updateCurrentByPartOid = SpecificationPartsService._toBoolean(req.body && req.body.update_current_by_part_oid);
      const result = await SpecificationPartsImportService.importFromBlocks(id, req.body || null, actor, {
        requestBaseUrl,
        updateCurrentByPartOid
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
      const groupByPartCode = String(req.query?.group_by_part_code || '').toLowerCase();
      const insertEmptyRowBetweenGroups = String(req.query?.insert_empty_row_between_groups || '').toLowerCase();
      const insertEmptyRowBetweenSameCodes = String(req.query?.insert_empty_row_between_same_codes || '').toLowerCase();
      const excludeWithoutPartCode = String(req.query?.exclude_without_part_code || '').toLowerCase();
      const result = await SpecificationPdfService.generateBySpecificationVersionId(id, actor, {
        groupByPartCode: groupByPartCode === 'true' || groupByPartCode === '1',
        insertBlankRowBetweenGroups: insertEmptyRowBetweenGroups === 'true' || insertEmptyRowBetweenGroups === '1',
        insertBlankRowBetweenSameCodes: insertEmptyRowBetweenSameCodes === 'true' || insertEmptyRowBetweenSameCodes === '1',
        excludeWithoutPartCode: excludeWithoutPartCode === 'true' || excludeWithoutPartCode === '1'
      });
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
