const SpecificationPart = require('../../db/models/SpecificationPart');
const SpecificationVersion = require('../../db/models/SpecificationVersion');
const pool = require('../../db/connection');
const { hasPermission } = require('./permissionChecker');

class SpecificationPartsService {
  static _toUserObject(row) {
    if (!row) return null;
    const fullName = [row.last_name, row.first_name, row.middle_name].filter(Boolean).join(' ').trim() || null;
    return {
      id: row.id,
      full_name: fullName,
      avatar_id: row.avatar_id ?? null,
    };
  }

  static async _loadUsersByIds(ids = []) {
    const uniqueIds = [...new Set((ids || []).map((id) => Number(id)).filter((id) => !Number.isNaN(id) && id > 0))];
    if (uniqueIds.length === 0) return new Map();

    const res = await pool.query(
      `SELECT id, first_name, last_name, middle_name, avatar_id FROM users WHERE id = ANY($1::int[])`,
      [uniqueIds]
    );
    return new Map((res.rows || []).map((row) => [row.id, SpecificationPartsService._toUserObject(row)]));
  }

  static _stripVersionMeta(row) {
    if (!row) return row;
    const { specification_version_id, created_by, created_at, updated_by, updated_at, ...rest } = row;
    return rest;
  }

  static async _versionMetaFromVersion(version) {
    if (!version) {
      return {
        specification_version_id: null,
        created_by: null,
        created_at: null,
        updated_by: null,
        updated_at: null,
      };
    }

    const userMap = await SpecificationPartsService._loadUsersByIds([version.created_by, version.updated_by]);
    return {
      specification_version_id: version.id ?? null,
      created_by: userMap.get(Number(version.created_by)) || null,
      created_at: version.created_at ?? null,
      updated_by: userMap.get(Number(version.updated_by)) || null,
      updated_at: version.updated_at ?? null,
    };
  }

  static async _resolveVersionMeta(query = {}, rows = []) {
    const requestedVersionId = query && query.specification_version_id !== undefined && query.specification_version_id !== null
      ? Number(query.specification_version_id)
      : null;

    const firstRowVersionId = Array.isArray(rows) && rows.length > 0 && rows[0]
      ? Number(rows[0].specification_version_id)
      : null;

    const versionId = Number.isNaN(requestedVersionId) || requestedVersionId === null
      ? (Number.isNaN(firstRowVersionId) || firstRowVersionId === null ? null : firstRowVersionId)
      : requestedVersionId;

    if (!versionId) {
      return {
        specification_version_id: requestedVersionId || null,
        created_by: null,
        created_at: null,
        updated_by: null,
        updated_at: null,
      };
    }

    const version = await SpecificationVersion.findById(versionId);
    if (!version) {
      return {
        specification_version_id: versionId,
        created_by: null,
        created_at: null,
        updated_by: null,
        updated_at: null,
      };
    }
    return await SpecificationPartsService._versionMetaFromVersion(version);
  }

  static async list(query = {}, actor) {
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, 'specifications.view');
    if (!allowed) { const err = new Error('Forbidden'); err.statusCode = 403; throw err; }
    const rows = await SpecificationPart.list(query);
    const meta = await SpecificationPartsService._resolveVersionMeta(query, rows);
    return {
      ...meta,
      data: rows.map((row) => SpecificationPartsService._stripVersionMeta(row))
    };
  }

  static async getById(id, actor) {
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, 'specifications.view');
    if (!allowed) { const err = new Error('Forbidden'); err.statusCode = 403; throw err; }
    const r = await SpecificationPart.findById(id);
    if (!r) { const err = new Error('Not found'); err.statusCode = 404; throw err; }
    const meta = await SpecificationPartsService._resolveVersionMeta({ specification_version_id: r.specification_version_id }, [r]);
    return {
      ...meta,
      data: SpecificationPartsService._stripVersionMeta(r)
    };
  }

  static async create(fields, actor) {
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, 'specifications.update');
    if (!allowed) { const err = new Error('Forbidden'); err.statusCode = 403; throw err; }
    if (!fields.specification_version_id) { const err = new Error('Missing fields'); err.statusCode = 400; throw err; }
    fields.created_by = actor.id;
    const created = await SpecificationPart.create(fields);
    if (!created) return null;
    const meta = await SpecificationPartsService._resolveVersionMeta({ specification_version_id: created.specification_version_id }, [created]);
    return {
      ...meta,
      data: SpecificationPartsService._stripVersionMeta(created)
    };
  }

  static async update(id, fields, actor) {
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, 'specifications.update');
    if (!allowed) { const err = new Error('Forbidden'); err.statusCode = 403; throw err; }
    const updated = await SpecificationPart.update(id, fields);
    if (!updated) { const err = new Error('Not found'); err.statusCode = 404; throw err; }
    const meta = await SpecificationPartsService._resolveVersionMeta({ specification_version_id: updated.specification_version_id }, [updated]);
    return {
      ...meta,
      data: SpecificationPartsService._stripVersionMeta(updated)
    };
  }

  static async delete(id, actor) {
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, 'specifications.delete');
    if (!allowed) { const err = new Error('Forbidden'); err.statusCode = 403; throw err; }
    const ok = await SpecificationPart.softDelete(id);
    if (!ok) { const err = new Error('Not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }
}

module.exports = SpecificationPartsService;
