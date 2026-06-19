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
    const useDefaultPartCode = options.useDefaultPartCode !== undefined
      ? Boolean(options.useDefaultPartCode)
      : (
        payload &&
        typeof payload === 'object' &&
        !Array.isArray(payload) &&
        payload.use_default_part_code !== undefined
          ? SpecificationPartsService._toBoolean(payload.use_default_part_code)
          : true
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
            dataConnector,
            options.requestBaseUrl || null,
            foranSettings.url
          )
          : importStrategy.key === 'equip_by_zone_oid'
            ? SpecificationPartsService._buildEquipmentByZoneRequestUrl(
              sourceConnector.url,
              projectConnector.project_code,
              oid,
              dataConnector,
              options.requestBaseUrl || null,
              foranSettings.url
            )
            : importStrategy.key === 'tray_by_system_oid'
              ? SpecificationPartsService._buildTrayBySystemRequestUrl(
                sourceConnector.url,
                projectConnector.project_code,
                oid,
                options.requestBaseUrl || null,
                foranSettings.url
              )
              : importStrategy.key === 'tray_by_zone_oid'
                ? SpecificationPartsService._buildTrayByZoneRequestUrl(
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

    // Keep BLOCKS, ASTRUCTURE, SYSTEMS, and EQUIPMENT/TRAY separated so their URLs, row shapes, and quantity rules never mix.
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
    const successfulImportSourceValues = new Set();
    const sourceExternalRowCounts = new Map();
    const addSourceExternalRowCount = (sourceValue, count) => {
      const sourceKey = String(sourceValue || '').trim();
      sourceExternalRowCounts.set(sourceKey, (sourceExternalRowCounts.get(sourceKey) || 0) + count);
    };

    for (const [strategyKey, connectors] of connectorGroups.entries()) {
      let groupHasRows = false;

      if (shouldUseDirectPayload) {
        // Direct payloads are already fetched; when there are several connectors
        // in the same branch the payload cannot be attributed more precisely.
        const sourceValue = connectors[0] ? connectors[0].sourceValue : null;
        // Direct payloads are already fetched; we only need to normalize them.
        const directRows = SpecificationPartsService._normalizePayloadRows(directPayload);
        successfulImportSourceValues.add(sourceValue);
        addSourceExternalRowCount(sourceValue, directRows.length);
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
        const sourceValue = connector.sourceValue;
        try {
          // Fetch the external payload, then normalize each row into the internal shape.
          const externalPayload = await SpecificationPartsService._fetchForanParts({
            url: connector.requestUrl,
            project_code: connector.project_code,
            oid: connector.oid
          }, foranSettings.token, strategyKey.toUpperCase());
          const externalRows = SpecificationPartsService._normalizePayloadRows(externalPayload);
          successfulImportSourceValues.add(sourceValue);
          addSourceExternalRowCount(sourceValue, externalRows.length);
          if (externalRows.length === 0) {
            continue;
          }
          for (const row of externalRows) {
            const normalizedRow = SpecificationPartsService._normalizeExternalRow(row, strategyKey);
            if (normalizedRow) {
              normalizedRows.push({ ...normalizedRow, sourceValue, importBranch: strategyKey });
              groupHasRows = true;
              importSourceValues.add(sourceValue);
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
    }

    // If nothing normalized successfully, either return a clean no-op or fail with the first connector error.
    if (normalizedRows.length === 0 && (!updateCurrentByPartOid || successfulImportSourceValues.size === 0)) {
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
    const sourceValues = [...(updateCurrentByPartOid ? successfulImportSourceValues : importSourceValues)];
    const incomingPartOidKeysBySource = new Map();
    if (updateCurrentByPartOid) {
      for (const row of normalizedRows) {
        if (!row || row.part_oid === null || row.part_oid === undefined) continue;
        const sourceKey = String(row.sourceValue || '').trim();
        if (!incomingPartOidKeysBySource.has(sourceKey)) {
          incomingPartOidKeysBySource.set(sourceKey, new Set());
        }
        incomingPartOidKeysBySource.get(sourceKey).add(String(row.part_oid));
      }
    }
    try {
      // Keep the allowed source values in sync with the persisted source values before writing.
      await SpecificationPartsService._ensureForanSourceAllowed(client, sourceValues);
      await client.query('BEGIN');

      const buildSourcePartOidKey = (sourceValue, partOid) => `${String(sourceValue || '').trim()}|${String(partOid)}`;
      const existingRowsBySourcePartOid = new Map();
      if (updateCurrentByPartOid) {
        const existingRowsRes = await client.query(
          `SELECT id, part_oid, source
           FROM specification_parts
           WHERE specification_version_id = $1
             AND source = ANY($2::text[])
             AND part_oid IS NOT NULL`,
          [versionId, sourceValues]
        );
        for (const existingRow of existingRowsRes.rows || []) {
          if (!existingRow || existingRow.part_oid === null || existingRow.part_oid === undefined) continue;
          const rowKey = buildSourcePartOidKey(existingRow.source, existingRow.part_oid);
          if (!existingRowsBySourcePartOid.has(rowKey)) {
            existingRowsBySourcePartOid.set(rowKey, existingRow.id);
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
      const pendingInsertRows = [];
      const persistedIds = [];
      let newCount = 0;
      let updatedCount = 0;
      let deletedCount = 0;
      let kitCount = 0;
      const INSERT_BATCH_SIZE = 100;
      const flushPendingInsertRows = async () => {
        if (pendingInsertRows.length === 0) {
          return [];
        }

        const insertedIds = [];

        while (pendingInsertRows.length > 0) {
          const batchRows = pendingInsertRows.splice(0, INSERT_BATCH_SIZE);
          const batchValues = [];
          const batchPlaceholders = [];
          let paramIndex = 1;

          for (const rowValues of batchRows) {
            batchPlaceholders.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
            batchValues.push(...rowValues);
          }

          const insertRes = await client.query(
            `INSERT INTO specification_parts
              (specification_version_id, part_code, part_oid, material_id, sfi_code_id, quantity, qty, zone, profile_dem, length, width, thickness, radius, angle, nest_id, symmetry, unit, part_type, descriptions, cog_x, cog_y, cog_z, strgroup, created_by, source)
             VALUES ${batchPlaceholders.join(', ')}
             RETURNING id`,
            batchValues
          );

          insertedIds.push(
            ...(insertRes.rows || [])
              .map((row) => row && row.id)
              .filter((id) => id !== null && id !== undefined)
          );
        }

        return insertedIds;
      };
      const syncLinkedKitPartsForAffectedRows = async (affectedIds) => {
        const uniqueAffectedIds = [...new Set((affectedIds || [])
          .map((id) => Number(id))
          .filter((id) => !Number.isNaN(id) && id > 0))];

        if (uniqueAffectedIds.length === 0) {
          return [];
        }

        const affectedRows = await SpecificationPart.findByIds(uniqueAffectedIds, client);
        const linkedKitIds = [];
        for (const row of (affectedRows || [])) {
          const rowLinkedKitIds = await SpecificationPartsService._syncLinkedKitPartsForParent(
            row,
            projectId,
            actor.id,
            client,
            { replaceExisting: true }
          );
          if (rowLinkedKitIds && rowLinkedKitIds.length > 0) {
            linkedKitIds.push(...rowLinkedKitIds);
            kitCount += rowLinkedKitIds.length;
          }
        }

        return [...new Set(linkedKitIds)];
      };
      const updateSql = `UPDATE specification_parts
         SET part_code = $1,
             part_oid = $2,
             material_id = $3,
             sfi_code_id = $4,
             quantity = $5,
             qty = $6,
             zone = $7,
             profile_dem = $8,
             length = $9,
             width = $10,
             thickness = $11,
             radius = $12,
             angle = $13,
             nest_id = $14,
             symmetry = $15,
             unit = $16,
             part_type = $17,
             descriptions = $18,
             cog_x = $19,
             cog_y = $20,
             cog_z = $21,
             strgroup = $22,
             created_by = $23,
             source = $24
         WHERE id = $25
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
        profile_dem: row.profile_dem ?? null,
        part_type: row.part_type ?? null,
        length: row.length ?? null,
        width: row.width ?? null,
        thickness: row.thickness ?? null,
        symmetry: row.symmetry ?? null,
        descriptions: row.descriptions ?? null,
        cog_x: row.cog_x ?? null,
        cog_y: row.cog_y ?? null,
        cog_z: row.cog_z ?? null,
        nest_id: row.nest_id ?? null,
        strgroup: row.strgroup ?? null,
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
        const materialPartCodeDef = material && material.part_code_def !== null && material.part_code_def !== undefined && String(material.part_code_def).trim() !== ''
          ? String(material.part_code_def).trim()
          : null;
        const partCode = useDefaultPartCode
          ? (materialPartCodeDef || row.part_code || null)
          : (row.part_code || null);
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
            : row.importBranch === 'tray_by_system_oid' || row.importBranch === 'tray_by_zone_oid'
              ? SpecificationPartsService._resolveTrayQuantityDetails(row, material)
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
          partCode,
          row.part_oid,
          materialId,
          row.sfi_code_id ?? null,
          resolvedQuantity,
          row.num_eq_part,
          row.zone,
          row.profile_dem ?? null,
          row.length,
          row.width,
          row.thickness,
          row.radius,
          row.angle,
          row.nest_id,
          row.symmetry,
          row.unit,
          row.part_type,
          null,
          row.cog_x,
          row.cog_y,
          row.cog_z,
          row.strgroup,
          actor.id,
          row.sourceValue
        ];
        const partOidKey = row.part_oid !== null && row.part_oid !== undefined ? String(row.part_oid) : null;
        const existingId = updateCurrentByPartOid && partOidKey
          ? existingRowsBySourcePartOid.get(buildSourcePartOidKey(row.sourceValue, partOidKey)) || null
          : null;
        if (existingId) {
          const updateRes = await client.query(updateSql, [...persistenceValues, existingId]);
          const updatedId = updateRes.rows && updateRes.rows[0] ? updateRes.rows[0].id : null;
          if (updatedId !== null && updatedId !== undefined) {
            persistedIds.push(updatedId);
            updatedCount += 1;
          }
          continue;
        }
        pendingInsertRows.push([
          versionId,
          ...persistenceValues
        ]);
        newCount += 1;
      }

      if (updateCurrentByPartOid && sourceValues.length > 0) {
        for (const sourceValue of sourceValues) {
          const sourceKey = String(sourceValue || '').trim();
          const incomingPartOidKeys = incomingPartOidKeysBySource.get(sourceKey) || new Set();
          const incomingPartOids = [...incomingPartOidKeys]
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value));
          if (incomingPartOids.length === 0) {
            if ((sourceExternalRowCounts.get(sourceKey) || 0) > 0) continue;
            const deleteRes = await client.query(
              `DELETE FROM specification_parts
               WHERE specification_version_id = $1
                 AND source = $2
                 AND part_oid IS NOT NULL`,
              [versionId, sourceValue]
            );
            deletedCount += deleteRes.rowCount || 0;
            continue;
          }
          const deleteRes = await client.query(
            `DELETE FROM specification_parts
             WHERE specification_version_id = $1
               AND source = $2
               AND part_oid IS NOT NULL
               AND part_oid <> ALL($3::bigint[])`,
            [versionId, sourceValue, incomingPartOids]
          );
          deletedCount += deleteRes.rowCount || 0;
        }
      }

      const insertedIds = await flushPendingInsertRows();
      persistedIds.push(...insertedIds);

      // If every row was rejected, commit the empty batch and return the report.
      if (persistedIds.length === 0) {
        await client.query('COMMIT');
        return {
          imported_count: 0,
          report_summary: {
            new_count: newCount,
            updated_count: updatedCount,
            deleted_count: deletedCount,
            kit_count: kitCount
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

      const linkedKitIds = await syncLinkedKitPartsForAffectedRows(persistedIds);
      const allAffectedIds = [...new Set([...persistedIds, ...linkedKitIds])];
      await SpecificationVersion.touch(versionId, actor.id, client);
      await client.query('COMMIT');

      // Re-read the inserted rows so the response matches the persisted database shape.
      const data = await SpecificationPart.findByIds(allAffectedIds);
      return {
        imported_count: data.length,
        report_summary: {
          new_count: newCount,
          updated_count: updatedCount,
          deleted_count: deletedCount,
          kit_count: kitCount
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
