const StatementsPart = require('../../db/models/StatementsPart');
const StatementsVersion = require('../../db/models/StatementsVersion');
const pool = require('../../db/connection');
const XLSX = require('xlsx');
const { hasPermission } = require('./permissionChecker');

class StatementsPartsService {
  static _toNumberOrNull(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }

  static _formatNumeric(value) {
    const n = StatementsPartsService._toNumberOrNull(value);
    if (n === null) return '0.000';
    return n.toFixed(3);
  }

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

  static _groupRowsByMaterial(rows = []) {
    const groups = new Map();

    for (const row of rows || []) {
      const materialId = Number(row && row.material_id);
      if (Number.isNaN(materialId)) continue;

      if (!groups.has(materialId)) {
        groups.set(materialId, {
          material: row.material || null,
          quantity: 0,
          totalWeight: 0,
          versions: new Map(),
        });
      }

      const group = groups.get(materialId);
      const quantity = StatementsPartsService._toNumberOrNull(row.quantity) ?? 0;
      const totalWeight = StatementsPartsService._toNumberOrNull(row.total_waight) ?? 0;

      group.quantity += quantity;
      group.totalWeight += totalWeight;

      const versionId = row.specification_version_id === null || row.specification_version_id === undefined
        ? null
        : Number(row.specification_version_id);
      const versionKey = versionId === null || Number.isNaN(versionId) ? '__null__' : String(versionId);

      if (!group.versions.has(versionKey)) {
        group.versions.set(versionKey, {
          specification_version_id: row.specification_version_id ?? null,
          specification_version: row.specification_version || null,
          specification: row.specification || null,
          quantity: 0,
          totalWeight: 0,
        });
      }

      const versionGroup = group.versions.get(versionKey);
      versionGroup.quantity += quantity;
      versionGroup.totalWeight += totalWeight;
    }

    return [...groups.values()].map((group) => ({
      material: group.material,
      quantity: StatementsPartsService._formatNumeric(group.quantity),
      total_waight: StatementsPartsService._formatNumeric(group.totalWeight),
      specification_versions: [...group.versions.values()].map((version) => ({
        specification_version_id: version.specification_version_id,
        specification_version: version.specification_version,
        specification: version.specification,
        quantity: StatementsPartsService._formatNumeric(version.quantity),
        total_waight: StatementsPartsService._formatNumeric(version.totalWeight),
      }))
    }));
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
    const page = Number(query && query.page !== undefined ? query.page : 1);
    const limit = Number(query && query.limit !== undefined ? query.limit : 0);
    const grouped = StatementsPartsService._groupRowsByMaterial(rows);
    const offset = Number.isFinite(page) && Number.isFinite(limit) && page > 0 && limit > 0 ? (page - 1) * limit : 0;
    const paged = limit > 0 ? grouped.slice(offset, offset + limit) : grouped;
    const meta = await StatementsPartsService._resolveVersionMeta(query, rows);
    return {
      ...meta,
      data: paged
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

  static async delete(fields = {}, actor) {
    const allowed = await hasPermission(actor, 'statements.delete');
    if (!allowed) { const err = new Error('Forbidden'); err.statusCode = 403; throw err; }

    const hasVersionFilter = fields.statements_version_id !== undefined && fields.statements_version_id !== null && fields.statements_version_id !== '';
    const hasMaterialFilter = fields.material_id !== undefined && fields.material_id !== null && fields.material_id !== '';

    if (!hasVersionFilter || !hasMaterialFilter) {
      const err = new Error('Missing fields');
      err.statusCode = 400;
      throw err;
    }

    const statementsVersionId = Number(fields.statements_version_id);
    const materialId = Number(fields.material_id);
    if (!statementsVersionId || Number.isNaN(statementsVersionId) || !materialId || Number.isNaN(materialId)) {
      const err = new Error('Invalid statements_version_id or material_id');
      err.statusCode = 400;
      throw err;
    }

    await StatementsPartsService._assertVersionUnlocked(statementsVersionId);
    const deletedCount = await StatementsPart.deleteByVersionAndMaterial(statementsVersionId, materialId);
    if (deletedCount === 0) {
      const err = new Error('Not found');
      err.statusCode = 404;
      throw err;
    }
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
        WITH statement_materials AS (
          SELECT DISTINCT
            emp.equipment_material_id AS material_id,
            1::numeric AS quantity_factor
          FROM equipment_materials_projects emp
          WHERE emp.statement_id = $1

          UNION ALL

          SELECT
            mki.material_id AS material_id,
            COALESCE(mki.quantity, 1)::numeric AS quantity_factor
          FROM equipment_materials_projects emp
          JOIN equipment_materials_project_kits empk
            ON empk.material_project_id = emp.id
          JOIN equipment_material_kit_items mki
            ON mki.kit_id = empk.material_kit_id
          WHERE emp.statement_id = $1
        ),
        latest_spec_versions AS (
          SELECT DISTINCT ON (spec.id)
            spec.id AS specification_id,
            sv.id AS specification_version_id
          FROM statements st
          JOIN specification spec ON spec.project_id = st.project_id
          JOIN specification_version sv ON sv.specification_id = spec.id
          WHERE st.id = $1
          ORDER BY spec.id, sv.created_at DESC NULLS LAST, sv.id DESC
        )
        SELECT
          sm.material_id,
          lsv.specification_version_id,
          SUM(COALESCE(sp.quantity, 1) * COALESCE(sm.quantity_factor, 1))::numeric AS quantity
        FROM statement_materials sm
        JOIN latest_spec_versions lsv ON TRUE
        JOIN specification_parts sp
          ON sp.material_id = sm.material_id
         AND sp.specification_version_id = lsv.specification_version_id
        GROUP BY
          sm.material_id,
          lsv.specification_version_id
        ORDER BY
          sm.material_id,
          lsv.specification_version_id
      `;

      const candidateRes = await client.query(candidateQuery, [statementId]);
      const insertedIds = [];

      for (const row of candidateRes.rows || []) {
        const insertRes = await client.query(
          `INSERT INTO statements_parts (statements_version_id, specification_version_id, material_id, quantity, created_by)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [versionId, row.specification_version_id, row.material_id, row.quantity, actor.id]
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

  static _normalizeSpecificationIds(payload = {}) {
    const candidates = [
      payload.specification_ids,
      payload.specificationIds,
      payload.ids,
      payload.specification_id,
      payload.specificationId,
      payload.specification && payload.specification.id,
      payload.specification,
      payload.specifications,
      payload.selected_specifications,
      payload.selectedSpecifications,
    ].filter((value) => value !== null && value !== undefined);

    const values = [];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        for (const item of candidate) {
          if (item && typeof item === 'object') {
            if (item.id !== undefined && item.id !== null) {
              values.push(item.id);
            }
          } else {
            values.push(item);
          }
        }
        continue;
      }
      if (candidate && typeof candidate === 'object') {
        if (candidate.id !== undefined && candidate.id !== null) {
          values.push(candidate.id);
        }
        continue;
      }
      values.push(candidate);
    }

    return [...new Set(values
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0))];
  }

  static _buildSpecificationWorkbook(rows = [], selectedSpecificationIds = []) {
    const headers = [
      '№',
      'Material ID',
      'Stock Code',
      'Material Name',
      'Unit',
      'Specification Code',
      'Quantity',
      'Total Weight',
    ];

    const grouped = new Map();

    for (const row of rows || []) {
      const materialId = StatementsPartsService._toNumberOrNull(row.material_id);
      if (materialId === null) {
        continue;
      }

      if (!grouped.has(materialId)) {
        grouped.set(materialId, {
          material_id: materialId,
          stock_code: '',
          material_name: '',
          unit_name: '',
          unit_kei: '',
          specification_labels: new Set(),
          quantity: 0,
          total_weight: 0,
        });
      }

      const group = grouped.get(materialId);
      const quantity = StatementsPartsService._toNumberOrNull(row.quantity) ?? 0;
      const unitId = StatementsPartsService._toNumberOrNull(row.unit_id);
      const materialWeight = StatementsPartsService._toNumberOrNull(row.material_weight);
      const rowUnitName = row.unit_name ? String(row.unit_name) : '';
      const rowUnitKei = row.unit_kei ? String(row.unit_kei) : '';
      const totalWeight = unitId === 2
        ? quantity
        : (materialWeight === null ? 0 : quantity * materialWeight);

      group.quantity += quantity;
      group.total_weight += totalWeight;
      if (!group.stock_code && row.stock_code) group.stock_code = String(row.stock_code);
      if (!group.material_name && row.material_name) group.material_name = String(row.material_name);
      if (!group.unit_name && rowUnitName) group.unit_name = rowUnitName;
      if (!group.unit_kei && rowUnitKei) group.unit_kei = rowUnitKei;
      if (row.specification_code) {
        const versionSuffix = row.specification_version ? ` (${String(row.specification_version)})` : '';
        group.specification_labels.add(`${String(row.specification_code)}${versionSuffix}`);
      }
    }

    const data = [...grouped.values()]
      .sort((a, b) => a.material_id - b.material_id)
      .map((group, index) => [
        index + 1,
        group.material_id,
        group.stock_code,
        group.material_name,
        group.unit_name ? `${group.unit_name}${group.unit_kei ? ` (${group.unit_kei})` : ''}` : '',
        [...group.specification_labels].join(', '),
        group.quantity,
        group.total_weight,
      ]);

    const sheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
    sheet['!cols'] = [
      { wch: 6 },
      { wch: 16 },
      { wch: 18 },
      { wch: 30 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 12 },
      { wch: 14 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Ведомость');

    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    const datePart = new Date().toISOString().slice(0, 10);

    return {
      buffer,
      filename: `statements_by_specifications_${datePart}.xlsx`,
      rows_count: data.length,
    };
  }

  static async exportFromSpecifications(payload = {}, actor) {
    if (!actor || !actor.id) {
      const err = new Error('Authentication required');
      err.statusCode = 401;
      throw err;
    }

    const allowed = await hasPermission(actor, 'specifications.view');
    if (!allowed) {
      const err = new Error('Forbidden');
      err.statusCode = 403;
      throw err;
    }

    const specificationIds = StatementsPartsService._normalizeSpecificationIds(payload);
    if (!specificationIds.length) {
      const err = new Error('Missing specification_id');
      err.statusCode = 400;
      throw err;
    }

    const latestVersionsRes = await pool.query(
      `
        WITH selected_specs AS (
          SELECT DISTINCT unnest($1::int[]) AS specification_id
        )
        SELECT DISTINCT ON (sv.specification_id)
          sv.specification_id,
          sv.id AS specification_version_id,
          sv.version AS specification_version,
          spec.code AS specification_code,
          spec.name AS specification_name
        FROM specification_version sv
        JOIN specification spec ON spec.id = sv.specification_id
        JOIN selected_specs ss ON ss.specification_id = sv.specification_id
        ORDER BY sv.specification_id, sv.created_at DESC NULLS LAST, sv.id DESC
      `,
      [specificationIds]
    );

    const latestVersions = latestVersionsRes.rows || [];
    const foundIds = new Set(latestVersions.map((row) => Number(row.specification_id)).filter((id) => Number.isInteger(id)));
    const validSpecificationIds = specificationIds.filter((id) => foundIds.has(id));
    if (validSpecificationIds.length === 0) {
      return StatementsPartsService._buildSpecificationWorkbook([], specificationIds);
    }

    const partsRes = await pool.query(
      `
        WITH latest_spec_versions AS (
          SELECT DISTINCT ON (sv.specification_id)
            sv.specification_id,
            sv.id AS specification_version_id,
            sv.version AS specification_version,
            spec.code AS specification_code,
            spec.name AS specification_name
          FROM specification_version sv
          JOIN specification spec ON spec.id = sv.specification_id
          WHERE sv.specification_id = ANY($1::int[])
          ORDER BY sv.specification_id, sv.created_at DESC NULLS LAST, sv.id DESC
        )
        SELECT
          lsv.specification_id,
          lsv.specification_version_id,
          lsv.specification_version,
          lsv.specification_code,
          lsv.specification_name,
          sp.material_id,
          m.stock_code,
          m.name AS material_name,
          m.description AS material_description,
          m.weight AS material_weight,
          m.unit_id,
          u.name AS unit_name,
          u.kei AS unit_kei,
          SUM(COALESCE(sp.quantity, 1))::numeric AS quantity
        FROM latest_spec_versions lsv
        JOIN specification_parts sp ON sp.specification_version_id = lsv.specification_version_id
        LEFT JOIN equipment_materials m ON m.id = sp.material_id
        LEFT JOIN units u ON u.id = m.unit_id
        GROUP BY
          lsv.specification_id,
          lsv.specification_version_id,
          lsv.specification_version,
          lsv.specification_code,
          lsv.specification_name,
          sp.material_id,
          m.stock_code,
          m.name,
          m.description,
          m.weight,
          m.unit_id,
          u.name,
          u.kei
        ORDER BY
          sp.material_id,
          lsv.specification_code,
          lsv.specification_version,
          lsv.specification_id
      `,
      [validSpecificationIds]
    );

    return StatementsPartsService._buildSpecificationWorkbook(partsRes.rows || [], specificationIds);
  }
}

module.exports = StatementsPartsService;
