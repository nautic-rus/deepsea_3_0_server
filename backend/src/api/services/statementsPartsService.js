const StatementsPart = require('../../db/models/StatementsPart');
const StatementsVersion = require('../../db/models/StatementsVersion');
const pool = require('../../db/connection');
const { hasPermission } = require('./permissionChecker');

class StatementsPartsService {
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
      `SELECT id, first_name, last_name, avatar_id FROM users WHERE id = ANY($1::int[])`,
      [uniqueIds]
    );
    return new Map((res.rows || []).map((row) => [row.id, StatementsPartsService._toUserObject(row)]));
  }

  static _stripVersionMeta(row) {
    if (!row) return row;
    const {
      statements_version_id,
      created_by,
      created_at,
      updated_by,
      updated_at,
      ...rest
    } = row;
    return rest;
  }

  static async _versionMetaFromVersion(version) {
    if (!version) {
      return {
        statements_version_id: null,
        created_by: null,
        created_at: null,
        updated_by: null,
        updated_at: null,
      };
    }

    const userMap = await StatementsPartsService._loadUsersByIds([version.created_by, version.updated_by]);
    return {
      statements_version_id: version.id ?? null,
      created_by: userMap.get(Number(version.created_by)) || null,
      created_at: version.created_at ?? null,
      updated_by: userMap.get(Number(version.updated_by)) || null,
      updated_at: version.updated_at ?? null,
    };
  }

  static _versionMetaFromRow(row) {
    if (!row) {
      return {
        statements_version_id: null,
        created_by: null,
        created_at: null,
        updated_by: null,
        updated_at: null,
      };
    }

    return {
      statements_version_id: row.statements_version_id ?? null,
      created_by: row.created_by ?? null,
      created_at: row.created_at ?? null,
      updated_by: row.updated_by ?? null,
      updated_at: row.updated_at ?? null,
    };
  }

  static async _resolveVersionMeta(query = {}, rows = []) {
    const requestedVersionId = query && query.statements_version_id !== undefined && query.statements_version_id !== null
      ? Number(query.statements_version_id)
      : null;

    const firstRowVersionId = Array.isArray(rows) && rows.length > 0 && rows[0]
      ? Number(rows[0].statements_version_id)
      : null;

    const versionId = Number.isNaN(requestedVersionId) || requestedVersionId === null
      ? (Number.isNaN(firstRowVersionId) || firstRowVersionId === null ? null : firstRowVersionId)
      : requestedVersionId;

    if (!versionId) {
      return {
        statements_version_id: requestedVersionId || null,
        created_by: null,
        created_at: null,
        updated_by: null,
        updated_at: null,
      };
    }

    const version = await StatementsVersion.findById(versionId);
    if (!version) {
      return { statements_version_id: versionId, created_by: null, created_at: null, updated_by: null, updated_at: null };
    }
    return await StatementsPartsService._versionMetaFromVersion(version);
  }

  static async _assertVersionUnlocked(versionId) {
    const version = await StatementsVersion.findById(versionId);
    if (!version) {
      const err = new Error('Statements version not found');
      err.statusCode = 404;
      throw err;
    }
    if (version.lock) {
      const err = new Error('Statements version is locked');
      err.statusCode = 423;
      throw err;
    }
    return version;
  }

  static async list(query = {}, actor) {
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, 'statements.view');
    if (!allowed) { const err = new Error('Forbidden'); err.statusCode = 403; throw err; }
    const rows = await StatementsPart.list(query);
    const meta = await StatementsPartsService._resolveVersionMeta(query, rows);
    return {
      ...meta,
      data: rows.map((row) => StatementsPartsService._stripVersionMeta(row))
    };
  }

  static async getById(id, actor) {
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, 'statements.view');
    if (!allowed) { const err = new Error('Forbidden'); err.statusCode = 403; throw err; }
    const r = await StatementsPart.findById(id);
    if (!r) { const err = new Error('Not found'); err.statusCode = 404; throw err; }
    const meta = await StatementsPartsService._resolveVersionMeta({ statements_version_id: r.statements_version_id }, [r]);
    return {
      ...meta,
      data: StatementsPartsService._stripVersionMeta(r)
    };
  }

  static async create(fields, actor) {
    const allowed = await hasPermission(actor, 'statements.update');
    if (!allowed) { const err = new Error('Forbidden'); err.statusCode = 403; throw err; }
    if (!fields.statements_version_id) { const err = new Error('Missing fields'); err.statusCode = 400; throw err; }
    await StatementsPartsService._assertVersionUnlocked(Number(fields.statements_version_id));
    fields.created_by = actor.id;
    const created = await StatementsPart.create(fields);
    if (!created) return null;
    const meta = await StatementsPartsService._resolveVersionMeta({ statements_version_id: created.statements_version_id }, [created]);
    return {
      ...meta,
      data: StatementsPartsService._stripVersionMeta(created)
    };
  }

  static async update(id, fields, actor) {
    const allowed = await hasPermission(actor, 'statements.update');
    if (!allowed) { const err = new Error('Forbidden'); err.statusCode = 403; throw err; }
    const existing = await StatementsPart.findById(id);
    if (!existing) { const err = new Error('Not found'); err.statusCode = 404; throw err; }
    await StatementsPartsService._assertVersionUnlocked(Number(existing.statements_version_id));
    const updated = await StatementsPart.update(id, fields);
    if (!updated) { const err = new Error('Not found'); err.statusCode = 404; throw err; }
    const meta = await StatementsPartsService._resolveVersionMeta({ statements_version_id: updated.statements_version_id }, [updated]);
    return {
      ...meta,
      data: StatementsPartsService._stripVersionMeta(updated)
    };
  }

  static async delete(id, actor) {
    const allowed = await hasPermission(actor, 'statements.delete');
    if (!allowed) { const err = new Error('Forbidden'); err.statusCode = 403; throw err; }
    const existing = await StatementsPart.findById(id);
    if (!existing) { const err = new Error('Not found'); err.statusCode = 404; throw err; }
    await StatementsPartsService._assertVersionUnlocked(Number(existing.statements_version_id));
    const ok = await StatementsPart.softDelete(id);
    if (!ok) { const err = new Error('Not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }

  static async applyFromStatementsVersion(statementsVersionId, actor) {
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, 'statements.update');
    if (!allowed) { const err = new Error('Forbidden'); err.statusCode = 403; throw err; }

    const versionId = Number(statementsVersionId);
    if (!versionId || Number.isNaN(versionId)) {
      const err = new Error('Invalid statements_version_id');
      err.statusCode = 400;
      throw err;
    }

    const version = await StatementsVersion.findById(versionId);
    if (!version) {
      const err = new Error('Statements version not found');
      err.statusCode = 404;
      throw err;
    }
    if (version.lock) {
      const err = new Error('Statements version is locked');
      err.statusCode = 423;
      throw err;
    }
    const statementId = Number(version.statement_id);
    if (!statementId || Number.isNaN(statementId)) {
      const err = new Error('Statements version is not linked to a statement');
      err.statusCode = 400;
      throw err;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query('DELETE FROM statements_parts WHERE statements_version_id = $1', [versionId]);

      const candidateQuery = `
        WITH latest_spec_versions AS (
          SELECT DISTINCT ON (emp.equipment_material_id)
            emp.equipment_material_id,
            sv.id AS specification_version_id
          FROM equipment_materials_projects emp
          JOIN specification_parts sp ON sp.material_id = emp.equipment_material_id
          JOIN specification_version sv ON sv.id = sp.specification_version_id
          WHERE emp.statement_id = $1
          ORDER BY emp.equipment_material_id, sv.created_at DESC NULLS LAST, sv.id DESC
        )
        SELECT
          l.equipment_material_id,
          MIN(sp.id) AS specification_part_id,
          SUM(COALESCE(sp.quantity, 1))::numeric AS quantity
        FROM latest_spec_versions l
        JOIN specification_parts sp
          ON sp.material_id = l.equipment_material_id
         AND sp.specification_version_id = l.specification_version_id
        GROUP BY l.equipment_material_id
        ORDER BY l.equipment_material_id
      `;

      const candidateRes = await client.query(candidateQuery, [statementId]);
      const insertedIds = [];

      for (const row of candidateRes.rows || []) {
        const insertRes = await client.query(
          `INSERT INTO statements_parts (statements_version_id, specification_part_id, quantity, created_by)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [versionId, row.specification_part_id, row.quantity, actor.id]
        );
        if (insertRes.rows[0] && insertRes.rows[0].id) {
          insertedIds.push(insertRes.rows[0].id);
        }
      }

      await client.query(
        `UPDATE statements_version
            SET updated_by = $2,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $1`,
        [versionId, actor.id]
      );

      await client.query('COMMIT');

      const rows = await Promise.all(insertedIds.map((id) => StatementsPart.findById(id)));
      return {
        statements_version_id: versionId,
        inserted_count: insertedIds.length,
        data: rows.filter(Boolean).map((row) => StatementsPartsService._stripVersionMeta(row))
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = StatementsPartsService;
