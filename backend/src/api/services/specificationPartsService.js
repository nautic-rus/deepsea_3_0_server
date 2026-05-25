const SpecificationPart = require('../../db/models/SpecificationPart');
const Specification = require('../../db/models/Specification');
const SpecificationVersion = require('../../db/models/SpecificationVersion');
const EnvironmentSetting = require('../../db/models/EnvironmentSetting');
const pool = require('../../db/connection');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { hasPermission } = require('./permissionChecker');

const execFileAsync = promisify(execFile);

class SpecificationPartsService {
  static async _loadForanRuntimeSettings() {
    try {
      const rows = await EnvironmentSetting.list(['FORAN_SERVICE_URL', 'FORAN_SERVICE_TOKEN']);
      const byKey = new Map((rows || []).map((row) => [row.key, row]));
      const urlRow = byKey.get('FORAN_SERVICE_URL');
      const tokenRow = byKey.get('FORAN_SERVICE_TOKEN');
      return {
        url: urlRow && urlRow.value !== undefined && urlRow.value !== null && String(urlRow.value).trim() !== ''
          ? String(urlRow.value).trim()
          : String(process.env.FORAN_SERVICE_URL || '').trim(),
        token: tokenRow && tokenRow.value !== undefined && tokenRow.value !== null && String(tokenRow.value).trim() !== ''
          ? String(tokenRow.value).trim()
          : String(process.env.FORAN_SERVICE_TOKEN || '').trim()
      };
    } catch (err) {
      return {
        url: String(process.env.FORAN_SERVICE_URL || '').trim(),
        token: String(process.env.FORAN_SERVICE_TOKEN || '').trim()
      };
    }
  }

  static _toNumberOrNull(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
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

  static _withComputedTotalWeight(row) {
    if (!row) return row;

    const quantity = SpecificationPartsService._toNumberOrNull(row.quantity) ?? 1;
    const material = row.material || null;
    const unitId = SpecificationPartsService._toNumberOrNull(material && material.unit ? material.unit.id : null);
    const materialWeight = SpecificationPartsService._toNumberOrNull(material ? material.weight : null);

    let totalWeight = null;
    if (unitId === 2) {
      totalWeight = quantity;
    } else if (materialWeight !== null) {
      totalWeight = quantity * materialWeight;
    }

    return {
      ...row,
      total_weight: totalWeight,
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

  static _normalizePayloadRows(payload) {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.rows)) return payload.rows;
    if (payload.data && Array.isArray(payload.data.rows)) return payload.data.rows;
    if (payload.result && Array.isArray(payload.result.rows)) return payload.result.rows;
    return [];
  }

  static _normalizeExternalRow(row) {
    if (!row || typeof row !== 'object') return null;
    const partCode = row.PART_CODE != null && String(row.PART_CODE).trim() !== ''
      ? String(row.PART_CODE).trim()
      : (row.PART_OID != null ? String(row.PART_OID) : null);
    const quantity = row.QTY !== undefined && row.QTY !== null && row.QTY !== ''
      ? Number(row.QTY)
      : 1;
    const length = row.LENGTH !== undefined && row.LENGTH !== null && row.LENGTH !== ''
      ? Number(row.LENGTH)
      : null;
    const width = row.WIDTH !== undefined && row.WIDTH !== null && row.WIDTH !== ''
      ? Number(row.WIDTH)
      : null;
    const thickness = row.THICKNESS !== undefined && row.THICKNESS !== null && row.THICKNESS !== ''
      ? Number(row.THICKNESS)
      : null;
    return {
      part_code: partCode,
      quantity: Number.isNaN(quantity) ? 1 : quantity,
      total_weight: row.TOTAL_WEIGHT !== undefined && row.TOTAL_WEIGHT !== null && row.TOTAL_WEIGHT !== ''
        ? Number(row.TOTAL_WEIGHT)
        : null,
      num_eq_part: row.NUM_EQ_PART !== undefined && row.NUM_EQ_PART !== null && row.NUM_EQ_PART !== ''
        ? Number(row.NUM_EQ_PART)
        : null,
      zone: row.BLOCK_CODE != null && String(row.BLOCK_CODE).trim() !== ''
        ? String(row.BLOCK_CODE).trim()
        : (row.STRGROUP != null && String(row.STRGROUP).trim() !== '' ? String(row.STRGROUP).trim() : null),
      stock_code: row.STOCK_CODE != null && String(row.STOCK_CODE).trim() !== ''
        ? String(row.STOCK_CODE).trim()
        : null,
      length: Number.isNaN(length) ? null : length,
      width: Number.isNaN(width) ? null : width,
      thickness: Number.isNaN(thickness) ? null : thickness,
      part_type: row.ELEM_TYPE != null && String(row.ELEM_TYPE).trim() !== ''
        ? String(row.ELEM_TYPE).trim()
        : null,
      symmetry: row.SYMMETRY != null && String(row.SYMMETRY).trim() !== ''
        ? String(row.SYMMETRY).trim()
        : null,
      unit: row.UNIT != null && String(row.UNIT).trim() !== ''
        ? String(row.UNIT).trim()
        : null,
      sfi_code_id: SpecificationPartsService._toNumberOrNull(row.SFI_CODE_ID ?? row.sfi_code_id ?? null),
      descriptions: row.PART_DESC != null && String(row.PART_DESC).trim() !== ''
        ? String(row.PART_DESC).trim()
        : null
    };
  }

  static _resolveQuantity(row, material) {
    const fallbackQuantity = row.quantity !== undefined && row.quantity !== null && !Number.isNaN(Number(row.quantity))
      ? Number(row.quantity)
      : 1;
    const totalWeight = row.total_weight !== null && row.total_weight !== undefined && !Number.isNaN(Number(row.total_weight))
      ? Number(row.total_weight)
      : null;
    const unitId = material && material.unit_id !== null && material.unit_id !== undefined && !Number.isNaN(Number(material.unit_id))
      ? Number(material.unit_id)
      : null;
    const materialWeight = material && material.weight !== null && material.weight !== undefined && !Number.isNaN(Number(material.weight))
      ? Number(material.weight)
      : null;

    if (unitId === 2) {
      return totalWeight !== null ? totalWeight : fallbackQuantity;
    }

    if (unitId === 1) {
      return row.num_eq_part !== null && row.num_eq_part !== undefined && !Number.isNaN(Number(row.num_eq_part))
        ? Number(row.num_eq_part)
        : fallbackQuantity;
    }

    if (totalWeight !== null && materialWeight !== null && materialWeight > 0) {
      return totalWeight / materialWeight;
    }

    return totalWeight !== null ? totalWeight : fallbackQuantity;
  }

  static _resolveForanBaseUrl(requestBaseUrl = null, runtimeUrl = null) {
    const configured = String(runtimeUrl || '').trim();
    if (configured) return configured;
    const fallback = String(requestBaseUrl || '').trim();
    if (fallback) return fallback;
    const host = String(process.env.FORAN_SERVICE_HOST || '127.0.0.1').trim() || '127.0.0.1';
    const port = String(process.env.FORAN_SERVICE_PORT || process.env.PORT || 3000).trim() || '3000';
    return `http://${host}:${port}`;
  }

  static _buildForanRequestUrl(template, projectCode, oid, sourceCode = null, requestBaseUrl = null, runtimeUrl = null) {
    const hasOidPlaceholder = String(template || '').includes('{oid}');
    const normalizedProjectCode = String(projectCode || '').trim().toLowerCase();
    const relativePath = String(template || '')
      .replaceAll('{project_code}', encodeURIComponent(normalizedProjectCode))
      .replaceAll('{oid}', encodeURIComponent(String(oid || '')));

    const url = new URL(relativePath, SpecificationPartsService._resolveForanBaseUrl(requestBaseUrl, runtimeUrl));
    if (!hasOidPlaceholder && oid !== undefined && oid !== null && String(oid).trim() !== '') {
      const paramName = String(sourceCode || '').trim() || 'oid';
      if (!url.searchParams.has(paramName)) {
        url.searchParams.set(paramName, String(oid));
      }
    }
    return url.toString();
  }

  static async _fetchForanParts(payloadMeta, runtimeToken = null) {
    const token = String(runtimeToken || '').trim();
    const curlArgs = [
      '-sS',
      '-f',
      '-L',
      '--compressed',
      '--connect-timeout',
      String(process.env.FORAN_SERVICE_CONNECT_TIMEOUT || 20),
      '--max-time',
      String(process.env.FORAN_SERVICE_MAX_TIME || 120),
      '-H',
      'Accept: application/json'
    ];
    if (token) {
      curlArgs.push('-H', `Authorization: Bearer ${token}`);
    }
    curlArgs.push(payloadMeta.url);

    try {
      const { stdout } = await execFileAsync('curl', curlArgs, {
        maxBuffer: 20 * 1024 * 1024
      });
      return JSON.parse(stdout);
    } catch (cause) {
      const causeMessage = cause && cause.message ? cause.message : 'curl failed';
      const baseUrlHint = String(process.env.FORAN_SERVICE_URL || '').trim()
        ? ''
        : ' Set FORAN_SERVICE_URL to an internal FORAN backend URL in production.';
      const err = new Error(`FORAN request failed for ${payloadMeta.url}: ${causeMessage}${baseUrlHint}`);
      err.statusCode = 502;
      err.cause = cause;
      err.url = payloadMeta.url;
      throw err;
    }
  }

  static async _resolveMaterialMap(rows = []) {
    const stockCodes = [...new Set(
      (rows || [])
        .map((row) => row && row.stock_code)
        .filter((value) => value !== null && value !== undefined && String(value).trim() !== '')
        .map((value) => String(value).trim().toUpperCase())
    )];

    if (stockCodes.length === 0) return new Map();

    const res = await pool.query(
      `SELECT m.id, m.stock_code, m.weight, m.unit_id
       FROM equipment_materials m
       WHERE UPPER(m.stock_code) = ANY($1::text[])`,
      [stockCodes]
    );
    return new Map((res.rows || []).map((row) => [String(row.stock_code).trim().toUpperCase(), {
      id: row.id,
      weight: row.weight,
      unit_id: row.unit_id
    }]));
  }

  static async _ensureForanSourceAllowed(client = pool) {
    await client.query(
      `ALTER TABLE IF EXISTS public.specification_parts
         DROP CONSTRAINT IF EXISTS specification_parts_source_check`
    );
    await client.query(
      `ALTER TABLE IF EXISTS public.specification_parts
         ADD CONSTRAINT specification_parts_source_check
         CHECK (source::text = ANY (ARRAY['import'::character varying, 'manual'::character varying, 'foran'::character varying]::text[]))`
    );
  }

  static async importFromForan(specificationVersionId, payload, actor, options = {}) {
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, 'specifications.update');
    if (!allowed) { const err = new Error('Forbidden'); err.statusCode = 403; throw err; }

    const versionId = Number(specificationVersionId);
    if (!versionId || Number.isNaN(versionId)) {
      const err = new Error('Invalid specification_version_id');
      err.statusCode = 400;
      throw err;
    }

    const version = await SpecificationVersion.findById(versionId);
    if (!version) {
      const err = new Error('Specification version not found');
      err.statusCode = 404;
      throw err;
    }

    const foranSettings = await SpecificationPartsService._loadForanRuntimeSettings();

    const connectorRows = await Specification.listConnectorsBySpecificationId(Number(version.specification_id));
    const validConnectorRows = (connectorRows || []).filter((connectorRow) => {
      if (!connectorRow) return false;
      const sourceConnector = connectorRow.source_connector || null;
      const projectConnector = connectorRow.project_connector || null;
      const dataConnector = connectorRow.data_connector || null;
      const oidValue = dataConnector ? dataConnector.oid : null;
      return Boolean(
        sourceConnector &&
        projectConnector &&
        oidValue !== null &&
        oidValue !== undefined &&
        String(oidValue).trim() !== ''
      );
    });

    if (validConnectorRows.length === 0) {
      const err = new Error('Specification connectors not found');
      err.statusCode = 404;
      throw err;
    }

    const directPayload = payload && (Array.isArray(payload) || payload.rows || (payload.data && payload.data.rows) || (payload.result && payload.result.rows))
      ? payload
      : null;

    const connectorSources = validConnectorRows.map((connectorRow) => {
      const sourceConnector = connectorRow.source_connector;
      const projectConnector = connectorRow.project_connector;
      const dataConnector = connectorRow.data_connector;
      const oid = dataConnector ? dataConnector.oid : null;
      const sourceValue = String(projectConnector.source || 'foran').trim() || 'foran';
      const requestUrl = SpecificationPartsService._buildForanRequestUrl(
        sourceConnector.url,
        projectConnector.project_code,
        oid,
        sourceConnector.code,
        options.requestBaseUrl || null,
        foranSettings.url
      );
      return {
        requestUrl,
        project_code: projectConnector.project_code,
        oid,
        sourceValue,
        sourceConnector,
        projectConnector,
        dataConnector
      };
    });

    const normalizedRows = [];
    const connectorFailures = [];
    if (directPayload) {
      const sourceValue = connectorSources[0] ? connectorSources[0].sourceValue : 'foran';
      const directRows = SpecificationPartsService._normalizePayloadRows(directPayload);
      for (const row of directRows) {
        const normalizedRow = SpecificationPartsService._normalizeExternalRow(row);
        if (normalizedRow) {
          normalizedRows.push({ ...normalizedRow, sourceValue });
        }
      }
    } else {
      for (const connector of connectorSources) {
        try {
          const externalPayload = await SpecificationPartsService._fetchForanParts({
            url: connector.requestUrl,
            project_code: connector.project_code,
            oid: connector.oid
          }, foranSettings.token);
          const externalRows = SpecificationPartsService._normalizePayloadRows(externalPayload);
          if (externalRows.length === 0) {
            continue;
          }
          for (const row of externalRows) {
            const normalizedRow = SpecificationPartsService._normalizeExternalRow(row);
            if (normalizedRow) {
              normalizedRows.push({ ...normalizedRow, sourceValue: connector.sourceValue });
            }
          }
        } catch (err) {
          connectorFailures.push({
            url: connector.requestUrl,
            message: err && err.message ? err.message : 'Unknown FORAN error'
          });
          continue;
        }
      }
    }

    if (normalizedRows.length === 0) {
      if (connectorFailures.length > 0) {
        const firstFailure = connectorFailures[0];
        const err = new Error(
          `FORAN import failed for all connectors. First failure: ${firstFailure.url} -> ${firstFailure.message}`
        );
        err.statusCode = 502;
        err.details = connectorFailures;
        throw err;
      }
      return {
        imported_count: 0,
        data: [],
        source: {
          url: connectorSources[0].requestUrl,
          project_code: connectorSources[0].project_code,
          oid: connectorSources[0].oid
        }
      };
    }

    const materialMap = await SpecificationPartsService._resolveMaterialMap(normalizedRows);
    const client = await pool.connect();
    try {
      await SpecificationPartsService._ensureForanSourceAllowed(client);
      await client.query('BEGIN');

      const sourceValues = [...new Set(connectorSources.map((connector) => connector.sourceValue))];
      await client.query(
        `DELETE FROM specification_parts
         WHERE specification_version_id = $1
           AND source = ANY($2::text[])`,
        [versionId, sourceValues]
      );

      const values = [];
      const placeholders = [];
      let idx = 1;
      for (const row of normalizedRows) {
        const materialKey = row.stock_code ? String(row.stock_code).trim().toUpperCase() : null;
        const material = materialKey ? (materialMap.get(materialKey) || null) : null;
        const materialId = material ? material.id : null;
        const resolvedQuantity = SpecificationPartsService._resolveQuantity(row, material);
        placeholders.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`);
        values.push(
          versionId,
          row.part_code,
          materialId,
          row.sfi_code_id ?? null,
          resolvedQuantity,
          row.num_eq_part,
          row.zone,
          row.length,
          row.width,
          row.thickness,
          row.symmetry,
          row.unit,
          row.part_type,
          row.descriptions,
          actor.id,
          row.sourceValue
        );
      }

      const insertRes = await client.query(
        `INSERT INTO specification_parts
          (specification_version_id, part_code, material_id, sfi_code_id, quantity, qty, zone, length, width, thickness, symmetry, unit, part_type, descriptions, created_by, source)
         VALUES ${placeholders.join(', ')}
         RETURNING id`,
        values
      );
      const insertedIds = (insertRes.rows || [])
        .map((row) => row && row.id)
        .filter((id) => id !== null && id !== undefined);

      await client.query('COMMIT');

      const data = await SpecificationPart.findByIds(insertedIds);
      return {
        imported_count: data.length,
        data,
        source: {
          url: connectorSources[0].requestUrl,
          project_code: connectorSources[0].project_code,
          oid: connectorSources[0].oid
        }
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async list(query = {}, actor) {
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, 'specifications.view');
    if (!allowed) { const err = new Error('Forbidden'); err.statusCode = 403; throw err; }
    const rows = await SpecificationPart.list(query);
    const meta = await SpecificationPartsService._resolveVersionMeta(query, rows);
    return {
      ...meta,
      data: rows
        .map((row) => SpecificationPartsService._withComputedTotalWeight(row))
        .map((row) => SpecificationPartsService._stripVersionMeta(row))
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
      data: SpecificationPartsService._stripVersionMeta(SpecificationPartsService._withComputedTotalWeight(created))
    };
  }

  static async update(fields, actor) {
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, 'specifications.update');
    if (!allowed) { const err = new Error('Forbidden'); err.statusCode = 403; throw err; }
    const id = Number(fields && fields.id);
    if (!id || Number.isNaN(id)) { const err = new Error('Missing fields'); err.statusCode = 400; throw err; }

    const updated = await SpecificationPart.update(id, fields);
    if (!updated) { const err = new Error('Not found'); err.statusCode = 404; throw err; }
    const meta = await SpecificationPartsService._resolveVersionMeta({ specification_version_id: updated.specification_version_id }, [updated]);
    return {
      ...meta,
      data: SpecificationPartsService._stripVersionMeta(SpecificationPartsService._withComputedTotalWeight(updated))
    };
  }

  static async delete(id, actor) {
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, 'specifications.update');
    if (!allowed) { const err = new Error('Forbidden'); err.statusCode = 403; throw err; }

    const partId = Number(id);
    if (!partId || Number.isNaN(partId)) {
      const err = new Error('Missing fields');
      err.statusCode = 400;
      throw err;
    }

    const ok = await SpecificationPart.softDelete(partId);
    if (!ok) {
      const err = new Error('Not found');
      err.statusCode = 404;
      throw err;
    }

    return { success: true };
  }
}

module.exports = SpecificationPartsService;
