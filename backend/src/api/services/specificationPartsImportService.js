const SpecificationPart = require('../../db/models/SpecificationPart');
const Specification = require('../../db/models/Specification');
const SpecificationVersion = require('../../db/models/SpecificationVersion');
const pool = require('../../db/connection');
const { hasPermission } = require('./permissionChecker');
const SpecificationPartsService = require('./specificationPartsService');

// Separate import coordinator for specification parts.
// It owns external source fetching and delegates normalization/persistence details
// to SpecificationPartsService so the two responsibilities do not get tangled.
class SpecificationPartsImportService {
  static async importFromBlocks(specificationVersionId, payload, actor, options = {}) {
    // Importing parts is an update operation, so we check identity and permissions first.
    if (!actor || !actor.id) {
      const err = new Error('Authentication required');
      err.statusCode = 401;
      throw err;
    }
    const allowed = await hasPermission(actor, 'specifications.update');
    if (!allowed) {
      const err = new Error('Forbidden');
      err.statusCode = 403;
      throw err;
    }

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
    const specification = await Specification.findById(Number(version.specification_id));
    if (!specification) {
      const err = new Error('Specification not found');
      err.statusCode = 404;
      throw err;
    }
    const projectId = Number(specification.project_id);
    if (!projectId || Number.isNaN(projectId)) {
      const err = new Error('Specification project not found');
      err.statusCode = 404;
      throw err;
    }
    if (version.lock) {
      const err = new Error('Specification version is locked');
      err.statusCode = 423;
      throw err;
    }

    // External services may use runtime config overrides from the database or env.
    const foranSettings = await SpecificationPartsService._loadForanRuntimeSettings();
    // Resolve the specification's connector set once and filter out incomplete rows.
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

    // If the request body already contains rows, skip the remote fetch and normalize directly.
    const directPayload = payload && (
      Array.isArray(payload) ||
      payload.rows ||
      payload.items ||
      (payload.data && (payload.data.rows || Array.isArray(payload.data))) ||
      (payload.result && (payload.result.rows || Array.isArray(payload.result)))
    )
      ? payload
      : null;
    const updateCurrentByPartOid = options.updateCurrentByPartOid !== undefined
      ? Boolean(options.updateCurrentByPartOid)
      : Boolean(
        payload &&
        typeof payload === 'object' &&
        !Array.isArray(payload) &&
        SpecificationPartsService._toBoolean(payload.update_current_by_part_oid)
      );

    // Convert connector records into request descriptors and decide which import branch applies.
    const connectorSources = validConnectorRows.map((connectorRow) => {
      const sourceConnector = connectorRow.source_connector;
      const projectConnector = connectorRow.project_connector;
      const dataConnector = connectorRow.data_connector;
      const oid = dataConnector ? dataConnector.oid : null;
      const importStrategy = SpecificationPartsService._resolveConnectorImportStrategy(connectorRow);
      const sourceValue = projectConnector && projectConnector.source !== undefined && projectConnector.source !== null
        ? String(projectConnector.source).trim() || null
        : null;
      const requestUrl = importStrategy.key === 'astructure'
        ? SpecificationPartsService._buildAstructureRequestUrl(
          sourceConnector.url,
          projectConnector.project_code,
          oid,
          options.requestBaseUrl || null,
          foranSettings.url
        )
        : importStrategy.key === 'systems'
          ? SpecificationPartsService._buildSystemsRequestUrl(
            sourceConnector.url,
            projectConnector.project_code,
            oid,
            options.requestBaseUrl || null,
            foranSettings.url
          )
        : importStrategy.key === 'equip_by_system_oid'
          ? SpecificationPartsService._buildEquipmentBySystemRequestUrl(
            sourceConnector.url,
            projectConnector.project_code,
            oid,
            options.requestBaseUrl || null,
            foranSettings.url
          )
          : importStrategy.key === 'equip_by_zone_oid'
            ? SpecificationPartsService._buildEquipmentByZoneRequestUrl(
              sourceConnector.url,
              projectConnector.project_code,
              oid,
              options.requestBaseUrl || null,
              foranSettings.url
            )
          : SpecificationPartsService._buildForanRequestUrl(
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
        importBranch: importStrategy.key,
        sourceConnector,
        projectConnector,
        dataConnector
      };
    });

    // Keep BLOCKS, ASTRUCTURE, SYSTEMS, and EQUIPMENT separated so their URLs, row shapes, and quantity rules never mix.
    const connectorGroups = new Map();
    for (const connector of connectorSources) {
      if (!connectorGroups.has(connector.importBranch)) {
        connectorGroups.set(connector.importBranch, []);
      }
      connectorGroups.get(connector.importBranch).push(connector);
    }

    const shouldUseDirectPayload = Boolean(directPayload) && connectorGroups.size === 1;
    const normalizedRows = [];
    const connectorFailures = [];
    const importSourceValues = new Set();

    for (const [strategyKey, connectors] of connectorGroups.entries()) {
      // Persist the unified source label for every imported row.
      const sourceValue = connectors[0] ? connectors[0].sourceValue : null;
      let groupHasRows = false;

      if (shouldUseDirectPayload) {
        // Direct payloads are already fetched; we only need to normalize them.
        const directRows = SpecificationPartsService._normalizePayloadRows(directPayload);
        for (const row of directRows) {
          const normalizedRow = SpecificationPartsService._normalizeExternalRow(row, strategyKey);
          if (normalizedRow) {
            normalizedRows.push({ ...normalizedRow, sourceValue, importBranch: strategyKey });
            groupHasRows = true;
          }
        }
        if (groupHasRows) {
          importSourceValues.add(sourceValue);
        }
        continue;
      }

      for (const connector of connectors) {
        try {
          // Fetch the external payload, then normalize each row into the internal shape.
          const externalPayload = await SpecificationPartsService._fetchForanParts({
            url: connector.requestUrl,
            project_code: connector.project_code,
            oid: connector.oid
          }, foranSettings.token, strategyKey.toUpperCase());
          const externalRows = SpecificationPartsService._normalizePayloadRows(externalPayload);
          if (externalRows.length === 0) {
            continue;
          }
          for (const row of externalRows) {
            const normalizedRow = SpecificationPartsService._normalizeExternalRow(row, strategyKey);
            if (normalizedRow) {
              normalizedRows.push({ ...normalizedRow, sourceValue, importBranch: strategyKey });
              groupHasRows = true;
            }
          }
        } catch (err) {
          // Track failures per connector so we can return a precise error summary.
          connectorFailures.push({
            url: connector.requestUrl,
            message: err && err.message ? err.message : `Unknown ${strategyKey.toUpperCase()} error`,
            source: sourceValue
          });
          continue;
        }
      }

      if (groupHasRows) {
        importSourceValues.add(sourceValue);
      }
    }

    // If nothing normalized successfully, either return a clean no-op or fail with the first connector error.
    if (normalizedRows.length === 0) {
      if (connectorFailures.length > 0) {
        const firstFailure = connectorFailures[0];
        const err = new Error(
          `${firstFailure.source ? firstFailure.source.toUpperCase() : 'FORAN'} import failed for all connectors. First failure: ${firstFailure.url} -> ${firstFailure.message}`
        );
        err.statusCode = 502;
        err.details = connectorFailures;
        throw err;
      }
      return {
        imported_count: 0,
        report_summary: {
          new_count: 0,
          updated_count: 0,
          deleted_count: 0
        },
        report: [],
        data: [],
        source: {
          url: connectorSources[0].requestUrl,
          project_code: connectorSources[0].project_code,
          oid: connectorSources[0].oid
        }
      };
    }

    // We need material weights and unit ids before we can resolve quantity.
    const materialMap = await SpecificationPartsService._resolveMaterialMap(normalizedRows, projectId);
    const globalMaterialMap = await SpecificationPartsService._resolveGlobalMaterialMap(normalizedRows);
    const report = [];
    const client = await pool.connect();
    const sourceValues = [...importSourceValues];
    try {
      // Keep the allowed source values in sync with the persisted source values before writing.
      await SpecificationPartsService._ensureForanSourceAllowed(client, sourceValues);
      await client.query('BEGIN');

      const existingRowsByPartOid = new Map();
      if (updateCurrentByPartOid) {
        const existingRowsRes = await client.query(
          `SELECT id, part_oid
           FROM specification_parts
           WHERE specification_version_id = $1
             AND source = ANY($2::text[])
             AND part_oid IS NOT NULL`,
          [versionId, sourceValues]
        );
        for (const existingRow of existingRowsRes.rows || []) {
          if (!existingRow || existingRow.part_oid === null || existingRow.part_oid === undefined) continue;
          const partOidKey = String(existingRow.part_oid);
          if (!existingRowsByPartOid.has(partOidKey)) {
            existingRowsByPartOid.set(partOidKey, existingRow.id);
          }
        }
      } else {
        // Replace prior imported rows for this version.
        const sourceValues = [...importSourceValues];
        await client.query(
          `DELETE FROM specification_parts
           WHERE specification_version_id = $1
            AND source = ANY($2::text[])`,
          [versionId, sourceValues]
        );
      }
      const values = [];
      const placeholders = [];
      const persistedIds = [];
      const incomingPartOidKeys = new Set();
      let newCount = 0;
      let updatedCount = 0;
      let deletedCount = 0;
      let idx = 1;
      const updateSql = `UPDATE specification_parts
         SET part_code = $1,
             part_oid = $2,
             material_id = $3,
             sfi_code_id = $4,
             quantity = $5,
             qty = $6,
             zone = $7,
             length = $8,
             width = $9,
             thickness = $10,
             radius = $11,
             angle = $12,
             symmetry = $13,
             unit = $14,
             part_type = $15,
             descriptions = $16,
             cog_x = $17,
             cog_y = $18,
             cog_z = $19,
             created_by = $20,
             source = $21
         WHERE id = $22
         RETURNING id`;
      const buildReportRow = (row, rowIndex, material, extra = {}) => ({
        row_index: rowIndex + 1,
        part_code: row.part_code ?? null,
        stock_code: row.stock_code ?? null,
        material_id: material && material.id !== undefined && material.id !== null ? material.id : null,
        branch: row.importBranch ?? null,
        unit_id: material && material.unit_id !== undefined && material.unit_id !== null ? material.unit_id : null,
        quantity: row.quantity ?? null,
        zone: row.zone ?? null,
        part_type: row.part_type ?? null,
        length: row.length ?? null,
        width: row.width ?? null,
        thickness: row.thickness ?? null,
        symmetry: row.symmetry ?? null,
        descriptions: row.descriptions ?? null,
        cog_x: row.cog_x ?? null,
        cog_y: row.cog_y ?? null,
        cog_z: row.cog_z ?? null,
        ...extra
      });
      const getMissingCogFields = (row) => {
        const missing = [];
        if (row.cog_x === null || row.cog_x === undefined || Number.isNaN(Number(row.cog_x))) missing.push('COG_X');
        if (row.cog_y === null || row.cog_y === undefined || Number.isNaN(Number(row.cog_y))) missing.push('COG_Y');
        if (row.cog_z === null || row.cog_z === undefined || Number.isNaN(Number(row.cog_z))) missing.push('COG_Z');
        return missing;
      };
      for (let rowIndex = 0; rowIndex < normalizedRows.length; rowIndex += 1) {
        const row = normalizedRows[rowIndex];
        const missingCogFields = getMissingCogFields(row);
        if (missingCogFields.length > 0) {
          report.push(buildReportRow(row, rowIndex, null, {
            reason: `Missing required COG fields: ${missingCogFields.join(', ')}`
          }));
          continue;
        }
        // Stock code is the lookup key that links external rows to internal materials.
        const materialKey = row.stock_code ? String(row.stock_code).trim().toUpperCase() : null;
        const material = materialKey ? (materialMap.get(materialKey) || null) : null;
        const globalMaterial = materialKey ? (globalMaterialMap.get(materialKey) || null) : null;
        const materialId = material ? material.id : null;
        if (!materialId) {
          report.push(buildReportRow(row, rowIndex, null, {
            reason: materialKey
              ? globalMaterial
                ? `Material ${materialKey} is not linked to project ${projectId}`
                : `Material not found for stock_code ${materialKey}`
              : 'stock_code is missing, material_id could not be resolved'
          }));
          continue;
        }
        // ASTRUCTURE and SYSTEMS use dedicated quantity resolvers; BLOCKS keeps the legacy behavior.
        const quantityResolution = row.importBranch === 'astructure'
          ? SpecificationPartsService._resolveAstructureQuantityDetails(row, material)
          : row.importBranch === 'systems'
            ? SpecificationPartsService._resolveSystemsQuantityDetails(row, material)
            : row.importBranch === 'equip_by_system_oid' || row.importBranch === 'equip_by_zone_oid'
              ? SpecificationPartsService._resolveEquipmentQuantityDetails(row, material)
            : SpecificationPartsService._resolveQuantityDetails(row, material);
        const resolvedQuantity = quantityResolution.quantity;
        const numericQuantity = SpecificationPartsService._toNumberOrNull(resolvedQuantity);
        if (numericQuantity === null || !Number.isFinite(numericQuantity) || numericQuantity <= 0) {
          report.push(buildReportRow(row, rowIndex, material, {
            quantity: resolvedQuantity,
            reason: 'Quantity must be greater than 0'
          }));
          continue;
        }
        if (!quantityResolution.calculated) {
          report.push(buildReportRow(row, rowIndex, material, {
            quantity: resolvedQuantity,
            reason: quantityResolution.reason || 'Quantity fell back to a default value'
          }));
          continue;
        }
        const persistenceValues = [
          row.part_code,
          row.part_oid,
          materialId,
          row.sfi_code_id ?? null,
          resolvedQuantity,
          row.num_eq_part,
          row.zone,
          row.length,
          row.width,
          row.thickness,
          row.radius,
          row.angle,
          row.symmetry,
          row.unit,
          row.part_type,
          row.descriptions ?? null,
          row.cog_x,
          row.cog_y,
          row.cog_z,
          actor.id,
          row.sourceValue
        ];
        const partOidKey = row.part_oid !== null && row.part_oid !== undefined ? String(row.part_oid) : null;
        const existingId = updateCurrentByPartOid && partOidKey ? existingRowsByPartOid.get(partOidKey) || null : null;
        if (existingId) {
          const updateRes = await client.query(updateSql, [...persistenceValues, existingId]);
          const updatedId = updateRes.rows && updateRes.rows[0] ? updateRes.rows[0].id : null;
          if (updatedId !== null && updatedId !== undefined) {
            persistedIds.push(updatedId);
            updatedCount += 1;
          }
          continue;
        }
        if (partOidKey) {
          incomingPartOidKeys.add(partOidKey);
        }
        placeholders.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`);
        values.push(
          versionId,
          ...persistenceValues
        );
        newCount += 1;
      }

      if (updateCurrentByPartOid && incomingPartOidKeys.size > 0) {
        const incomingPartOids = [...incomingPartOidKeys]
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value));
        if (incomingPartOids.length > 0) {
          const deleteRes = await client.query(
            `DELETE FROM specification_parts
             WHERE specification_version_id = $1
               AND source = ANY($2::text[])
               AND part_oid IS NOT NULL
               AND part_oid <> ALL($3::bigint[])`,
            [versionId, sourceValues, incomingPartOids]
          );
          deletedCount = deleteRes.rowCount || 0;
        }
      }

      // If every row was rejected, commit the empty batch and return the report.
      if (placeholders.length === 0) {
        if (persistedIds.length === 0) {
          await client.query('COMMIT');
          return {
            imported_count: 0,
            report_summary: {
              new_count: newCount,
              updated_count: updatedCount,
              deleted_count: deletedCount
            },
            report,
            data: [],
            source: {
              url: connectorSources[0].requestUrl,
              project_code: connectorSources[0].project_code,
              oid: connectorSources[0].oid
            }
          };
        }

        await SpecificationVersion.touch(versionId, actor.id, client);
        await client.query('COMMIT');
        const data = await SpecificationPart.findByIds(persistedIds);
        return {
          imported_count: data.length,
          report_summary: {
            new_count: newCount,
            updated_count: updatedCount,
            deleted_count: deletedCount
          },
          report,
          data,
          source: {
            url: connectorSources[0].requestUrl,
            project_code: connectorSources[0].project_code,
            oid: connectorSources[0].oid
          }
        };
      }

      const insertRes = await client.query(
        `INSERT INTO specification_parts
          (specification_version_id, part_code, part_oid, material_id, sfi_code_id, quantity, qty, zone, length, width, thickness, radius, angle, symmetry, unit, part_type, descriptions, cog_x, cog_y, cog_z, created_by, source)
         VALUES ${placeholders.join(', ')}
         RETURNING id`,
        values
      );
      const insertedIds = (insertRes.rows || [])
        .map((row) => row && row.id)
        .filter((id) => id !== null && id !== undefined);
      const affectedIds = [...persistedIds, ...insertedIds];
      await SpecificationVersion.touch(versionId, actor.id, client);

      await client.query('COMMIT');

      // Re-read the inserted rows so the response matches the persisted database shape.
      const data = await SpecificationPart.findByIds(affectedIds);
      return {
        imported_count: data.length,
        report_summary: {
          new_count: newCount,
          updated_count: updatedCount,
          deleted_count: deletedCount
        },
        report,
        data,
        source: {
          url: connectorSources[0].requestUrl,
          project_code: connectorSources[0].project_code,
          oid: connectorSources[0].oid
        }
      };
    } catch (err) {
      // Any database error should roll back the entire import batch.
      await client.query('ROLLBACK');
      throw err;
    } finally {
      // Always return the connection to the pool.
      client.release();
    }
  }

  static async importFromForan(specificationVersionId, payload, actor, options = {}) {
    // Backward-compatible alias: existing callers can keep using the older method name.
    return await SpecificationPartsImportService.importFromBlocks(specificationVersionId, payload, actor, options);
  }
}

module.exports = SpecificationPartsImportService;
