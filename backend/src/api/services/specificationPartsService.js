const SpecificationPart = require('../../db/models/SpecificationPart');
const SpecificationVersion = require('../../db/models/SpecificationVersion');
const Specification = require('../../db/models/Specification');
const EnvironmentSetting = require('../../db/models/EnvironmentSetting');
const pool = require('../../db/connection');
const { hasPermission } = require('./permissionChecker');

// SpecificationPartsService owns the canonical CRUD behavior for specification_parts.
// Import orchestration lives in SpecificationPartsImportService so this file stays focused
// on row transformation, lookup helpers, and direct part persistence.
class SpecificationPartsService {
  // Runtime FORAN-style settings are shared by import flows.
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

  // Convert a users row into the compact shape used in API responses.
  static _toUserObject(row) {
    if (!row) return null;
    const fullName = [row.last_name, row.first_name, row.middle_name].filter(Boolean).join(' ').trim() || null;
    return {
      id: row.id,
      full_name: fullName,
      avatar_id: row.avatar_id ?? null,
    };
  }

  static _normalizeText(value) {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  }

  static _normalizeLowerText(value) {
    return SpecificationPartsService._normalizeText(value).toLowerCase();
  }

  static _toBoolean(value) {
    if (value === true || value === false) return value;
    if (value === 1 || value === '1') return true;
    if (value === 0 || value === '0') return false;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true') return true;
      if (normalized === 'false') return false;
    }
    return false;
  }

  static _pickExternalValue(row, keys = []) {
    if (!row || typeof row !== 'object') return null;
    for (const key of keys) {
      if (!Object.prototype.hasOwnProperty.call(row, key)) continue;
      const value = row[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return value;
      }
    }
    return null;
  }

  // Enrich part rows with derived total weight when we already know the material.
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

  static _resolvePartMass(row) {
    if (!row) return null;

    const quantity = SpecificationPartsService._toNumberOrNull(row.quantity) ?? 1;
    const material = row.material || null;
    const unitId = SpecificationPartsService._toNumberOrNull(material && material.unit ? material.unit.id : null);
    const materialWeight = SpecificationPartsService._toNumberOrNull(material ? material.weight : null);

    if (unitId === 2) {
      return quantity;
    }

    if (materialWeight === null) {
      return null;
    }

    return quantity * materialWeight;
  }

  static _resolvePartCog(row) {
    if (!row) return null;

    const cogX = SpecificationPartsService._toNumberOrNull(row.cog_x);
    const cogY = SpecificationPartsService._toNumberOrNull(row.cog_y);
    const cogZ = SpecificationPartsService._toNumberOrNull(row.cog_z);

    if (cogX === null || cogY === null || cogZ === null) {
      return null;
    }

    return { x: cogX, y: cogY, z: cogZ };
  }

  static _buildCenterOfMassError(message, details = null, statusCode = 400) {
    const err = new Error(message);
    err.statusCode = statusCode;
    if (details) {
      err.details = details;
    }
    return err;
  }

  static _buildKitChildKey(partCode, materialId) {
    return `${partCode === null || partCode === undefined ? '' : String(partCode).trim()}|${materialId === null || materialId === undefined ? '' : String(materialId).trim()}`;
  }

  static async _loadLinkedKitItemsByMaterialIds(projectId, materialIds = [], executor = pool) {
    const uniqueMaterialIds = [...new Set((materialIds || [])
      .map((id) => Number(id))
      .filter((id) => !Number.isNaN(id) && id > 0))];

    if (!projectId || Number.isNaN(Number(projectId)) || uniqueMaterialIds.length === 0) {
      return new Map();
    }

    const materialProjectRes = await executor.query(
      `
      SELECT DISTINCT
        emp.id AS material_project_id,
        emp.equipment_material_id
      FROM equipment_materials_projects emp
      JOIN statements st ON st.id = emp.statement_id
      WHERE st.project_id = $1
        AND emp.equipment_material_id = ANY($2::int[])
      `,
      [Number(projectId), uniqueMaterialIds]
    );

    const materialProjectRows = materialProjectRes.rows || [];
    const materialProjectIds = [...new Set(materialProjectRows
      .map((row) => Number(row.material_project_id))
      .filter((id) => !Number.isNaN(id) && id > 0))];

    if (materialProjectIds.length === 0) {
      return new Map();
    }

    const kitLinksRes = await executor.query(
      `
      SELECT material_project_id, material_kit_id
      FROM equipment_materials_project_kits
      WHERE material_project_id = ANY($1::int[])
      ORDER BY material_project_id, id
      `,
      [materialProjectIds]
    );

    const kitLinkRows = kitLinksRes.rows || [];
    if (kitLinkRows.length === 0) {
      return new Map();
    }

    const kitIds = [...new Set(kitLinkRows
      .map((row) => Number(row.material_kit_id))
      .filter((id) => !Number.isNaN(id) && id > 0))];

    if (kitIds.length === 0) {
      return new Map();
    }

    const kitItemsRes = await executor.query(
      `
      SELECT id, kit_id, part_code, material_id, quantity
      FROM equipment_material_kit_items
      WHERE kit_id = ANY($1::int[])
      ORDER BY kit_id, id
      `,
      [kitIds]
    );

    const kitItemsByKitId = new Map();
    for (const row of (kitItemsRes.rows || [])) {
      const kitId = Number(row.kit_id);
      if (!Number.isFinite(kitId) || kitId <= 0) continue;
      if (!kitItemsByKitId.has(kitId)) kitItemsByKitId.set(kitId, []);
      kitItemsByKitId.get(kitId).push({
        id: row.id,
        kit_id: kitId,
        part_code: row.part_code || null,
        material_id: row.material_id === null || row.material_id === undefined ? null : Number(row.material_id),
        quantity: SpecificationPartsService._toNumberOrNull(row.quantity) ?? 1,
      });
    }

    const materialProjectIdToMaterialId = new Map(
      materialProjectRows.map((row) => [Number(row.material_project_id), Number(row.equipment_material_id)])
    );
    const kitIdsByMaterialId = new Map();

    for (const link of kitLinkRows) {
      const materialProjectId = Number(link.material_project_id);
      const kitId = Number(link.material_kit_id);
      if (!Number.isFinite(materialProjectId) || materialProjectId <= 0 || !Number.isFinite(kitId) || kitId <= 0) continue;
      const materialId = materialProjectIdToMaterialId.get(materialProjectId);
      if (!materialId) continue;
      if (!kitIdsByMaterialId.has(materialId)) kitIdsByMaterialId.set(materialId, new Set());
      kitIdsByMaterialId.get(materialId).add(kitId);
    }

    const rowsByMaterialId = new Map();
    for (const [materialId, kitIdSet] of kitIdsByMaterialId.entries()) {
      const kitRows = [];
      for (const kitId of kitIdSet.values()) {
        const kitItems = kitItemsByKitId.get(Number(kitId)) || [];
        for (const item of kitItems) {
          kitRows.push({
            kit_id: Number(kitId),
            kit_item_id: item.id,
            part_code: item.part_code || null,
            material_id: item.material_id,
            quantity: item.quantity ?? 1,
          });
        }
      }
      rowsByMaterialId.set(Number(materialId), kitRows);
    }

    return rowsByMaterialId;
  }

  static async _syncLinkedKitPartsForParent(parentPart, projectId, actorId, executor = pool, options = {}) {
    if (!parentPart || !Number.isFinite(Number(parentPart.id)) || !Number.isFinite(Number(parentPart.material_id))) {
      return [];
    }

    const replaceExisting = Boolean(options.replaceExisting);
    const kitRowsByMaterialId = await SpecificationPartsService._loadLinkedKitItemsByMaterialIds(
      projectId,
      [Number(parentPart.material_id)],
      executor
    );
    const kitRows = kitRowsByMaterialId.get(Number(parentPart.material_id)) || [];
    const kitSource = 'kit';
    const parentQuantity = SpecificationPartsService._toNumberOrNull(parentPart.quantity) ?? 1;
    const parentCogX = parentPart.cog_x ?? null;
    const parentCogY = parentPart.cog_y ?? null;
    const parentCogZ = parentPart.cog_z ?? null;

    if (replaceExisting) {
      await executor.query(
        `
        DELETE FROM specification_parts
        WHERE parent_id = $1
          AND source = $2
        `,
        [Number(parentPart.id), kitSource]
      );
    } else if (kitRows.length === 0) {
      return [];
    }

    if (kitRows.length === 0) {
      return [];
    }

    const touchedIds = [];
    for (const kitRow of kitRows) {
      const quantity = (parentQuantity ?? 1) * (SpecificationPartsService._toNumberOrNull(kitRow.quantity) ?? 1);
      const childFields = {
        specification_version_id: parentPart.specification_version_id,
        parent_id: Number(parentPart.id),
        part_code: kitRow.part_code || null,
        part_oid: null,
        drawing_address: null,
        material_id: kitRow.material_id === null || kitRow.material_id === undefined ? null : Number(kitRow.material_id),
        sfi_code_id: null,
        quantity,
        qty: quantity,
        zone: null,
        profile_dem: null,
        nest_id: null,
        length: null,
        width: null,
        thickness: null,
        radius: null,
        angle: null,
        symmetry: null,
        strgroup: null,
        unit: null,
        part_type: null,
        descriptions: null,
        cog_x: parentCogX,
        cog_y: parentCogY,
        cog_z: parentCogZ,
        created_by: actorId,
        source: kitSource
      };

      const created = await SpecificationPart.create(childFields, executor);
      if (created && created.id !== undefined && created.id !== null) {
        touchedIds.push(Number(created.id));
      }
    }

    return touchedIds;
  }

  static _calculateCenterOfMass(rows = []) {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw SpecificationPartsService._buildCenterOfMassError(
        'Specification version has no parts',
        null,
        404
      );
    }

    let totalMass = 0;
    let weightedX = 0;
    let weightedY = 0;
    let weightedZ = 0;
    const invalidParts = [];

    for (const row of rows) {
      const mass = SpecificationPartsService._resolvePartMass(row);
      const cog = SpecificationPartsService._resolvePartCog(row);
      const partId = row && row.id !== undefined && row.id !== null ? Number(row.id) : null;

      if (mass === null || !Number.isFinite(mass) || mass <= 0 || !cog) {
        invalidParts.push({
          id: partId,
          part_code: row && row.part_code ? row.part_code : null,
          reason: mass === null || !Number.isFinite(mass) || mass <= 0
            ? 'mass is missing or invalid'
            : 'cog is missing or invalid'
        });
        continue;
      }

      totalMass += mass;
      weightedX += mass * cog.x;
      weightedY += mass * cog.y;
      weightedZ += mass * cog.z;
    }

    if (invalidParts.length > 0) {
      throw SpecificationPartsService._buildCenterOfMassError(
        'One or more parts are missing mass or COG',
        { invalid_parts: invalidParts },
        400
      );
    }

    if (!Number.isFinite(totalMass) || totalMass <= 0) {
      throw SpecificationPartsService._buildCenterOfMassError(
        'Unable to calculate center of mass because total mass is zero',
        null,
        400
      );
    }

    return {
      total_mass: totalMass,
      center_of_mass: {
        x: weightedX / totalMass,
        y: weightedY / totalMass,
        z: weightedZ / totalMass,
      },
    };
  }

  static async _loadUsersByIds(ids = []) {
    // Batch-load user profiles so list responses do not issue per-row queries.
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
    // Attach creator/updater metadata to part lists and part mutations.
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
    // Prefer the requested version id, but fall back to the first row when listing parts.
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

  static async _assertVersionUnlocked(versionId) {
    const version = await SpecificationVersion.findById(versionId);
    if (!version) {
      const err = new Error('Specification version not found');
      err.statusCode = 404;
      throw err;
    }
    if (version.lock) {
      const err = new Error('Specification version is locked');
      err.statusCode = 423;
      throw err;
    }
    return version;
  }

  static _normalizePayloadRows(payload) {
    // Accept a few common payload envelopes so both APIs and direct JSON payloads work.
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.rows)) return payload.rows;
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.items)) return payload.items;
    if (payload.data && Array.isArray(payload.data.rows)) return payload.data.rows;
    if (payload.data && Array.isArray(payload.data.items)) return payload.data.items;
    if (payload.result && Array.isArray(payload.result.rows)) return payload.result.rows;
    if (payload.result && Array.isArray(payload.result.items)) return payload.result.items;
    return [];
  }

  static _normalizeExternalRow(row, sourceKey = 'blocks') {
    // Normalize a single external row into the internal specification_parts shape.
    // The mapping varies slightly between BLOCKS, ASTRUCTURE, SYSTEMS, and EQUIPMENT/TRAY rows.
    if (!row || typeof row !== 'object') return null;
    const sourceModeRaw = SpecificationPartsService._normalizeLowerText(sourceKey);
    let sourceMode = 'blocks';
    if (sourceModeRaw === 'astructure') {
      sourceMode = 'astructure';
    } else if (sourceModeRaw === 'systems') {
      sourceMode = 'systems';
    } else if (sourceModeRaw === 'equip_by_system_oid' || sourceModeRaw === 'equip_by_zone_oid') {
      sourceMode = 'equipment';
    } else if (sourceModeRaw === 'tray_by_system_oid' || sourceModeRaw === 'tray_by_zone_oid') {
      sourceMode = 'tray';
    }
    const partCodeKeys = sourceMode === 'astructure'
      ? ['CODEID', 'codeid']
      : sourceMode === 'systems'
        ? ['SPOOLID', 'spoolid', 'CODEID', 'codeid', 'PART_CODE', 'part_code', 'code', 'CODE']
      : sourceMode === 'equipment'
        ? ['ELEMENT_USERID', 'element_userid', 'ELEMENT_NAME', 'element_name']
      : sourceMode === 'tray'
        ? ['USERID', 'userid', 'TRAY_FITTING', 'tray_fitting']
      : ['PART_CODE', 'part_code', 'code', 'CODE'];
    const partOidKeys = sourceMode === 'astructure'
      ? ['MOD_OID', 'mod_oid']
      : sourceMode === 'systems'
      ? ['SQINSYSTEM', 'sqinsystem']
      : sourceMode === 'equipment'
        ? ['ELEMENT_OID', 'element_oid']
      : sourceMode === 'tray'
        ? ['IDSQ', 'idsq', 'ELEM', 'elem']
      : ['PART_OID', 'part_oid'];
    const totalWeightKeys = sourceMode === 'astructure'
      ? ['WEIGHT', 'weight', 'TOTAL_WEIGHT', 'total_weight']
      : sourceMode === 'systems'
        ? ['WEIGHT', 'weight', 'WIEGHT', 'wieght', 'TOTAL_WEIGHT', 'total_weight']
      : sourceMode === 'tray'
        ? ['WEIGHT', 'weight']
      : ['WEIGHT_UNIT', 'weight_unit'];
    const zoneKeys = sourceMode === 'astructure'
      ? ['ZONE', 'zone', 'BLOCK_CODE', 'block_code', 'STRGROUP', 'strgroup']
      : sourceMode === 'systems'
        ? ['ZONENAME', 'zonename', 'ZONE', 'zone', 'BLOCK_CODE', 'block_code', 'STRGROUP', 'strgroup']
      : sourceMode === 'equipment'
        ? ['ZONE_NAME', 'zone_name', 'ZONE_USERID', 'zone_userid']
      : sourceMode === 'tray'
        ? ['ZONE_NAME', 'zone_name', 'ZONE', 'zone']
      : ['BLOCK_CODE', 'block_code', 'zone', 'ZONE', 'STRGROUP', 'strgroup'];
    const stockCodeKeys = sourceMode === 'astructure'
      ? ['STOCK', 'stock', 'STOCK_CODE', 'stock_code']
      : sourceMode === 'systems'
        ? ['STOCKCODE', 'stockcode', 'STOCK', 'stock', 'STOCK_CODE', 'stock_code']
      : sourceMode === 'equipment'
        ? ['COMPONENT_STOCK_CODE', 'component_stock_code']
      : sourceMode === 'tray'
        ? ['STOCK_CODE', 'stock_code', 'COMP_STOCK', 'comp_stock']
      : ['STOCK_CODE', 'stock_code'];
    const descriptionsKeys = sourceMode === 'astructure'
      ? ['MATERIAL_DESCRIPTION', 'material_description', 'NORM_DESCR', 'norm_descr', 'DESCRIPTION', 'description', 'PART_DESC', 'part_desc']
      : sourceMode === 'systems'
        ? ['SYSTEMNAME', 'systemname', 'ZONENAME', 'zonename', 'MATERIAL_DESCRIPTION', 'material_description', 'NORM_DESCR', 'norm_descr', 'DESCRIPTION', 'description', 'PART_DESC', 'part_desc']
      : sourceMode === 'equipment'
        ? []
      : sourceMode === 'tray'
        ? ['TRAY_FITTING', 'tray_fitting', 'TYPE', 'type', 'LINE', 'line', 'CTYPE', 'ctype']
      : ['PART_DESC', 'part_desc', 'description', 'DESCRIPTION'];
    const partType = sourceMode === 'systems'
      ? String(SpecificationPartsService._pickExternalValue(row, ['TYPECODE', 'typecode']) || '').trim() || null
      : sourceMode === 'blocks'
        ? String(SpecificationPartsService._pickExternalValue(row, ['ELEM_TYPE', 'elem_type']) || '').trim() || null
      : sourceMode === 'tray'
        ? 'TRAY'
      : null;
    const partCodeRaw = SpecificationPartsService._pickExternalValue(row, partCodeKeys);
    const partOidRaw = SpecificationPartsService._pickExternalValue(row, partOidKeys);
    const partCode = partCodeRaw != null && String(partCodeRaw).trim() !== ''
      ? String(partCodeRaw).trim()
      : null;
    const partOid = SpecificationPartsService._toNumberOrNull(partOidRaw);
    const quantityRaw = SpecificationPartsService._pickExternalValue(row, ['QTY', 'qty', 'quantity', 'QUANTITY']);
    const quantity = sourceMode === 'equipment' || sourceMode === 'tray'
      ? 1
      : quantityRaw !== null && quantityRaw !== undefined && quantityRaw !== ''
      ? Number(quantityRaw)
      : 1;
    const lengthRaw = SpecificationPartsService._pickExternalValue(row, ['LENGTH', 'length']);
    const widthRaw = SpecificationPartsService._pickExternalValue(row, ['WIDTH', 'width']);
    const thicknessRaw = SpecificationPartsService._pickExternalValue(row, ['THICKNESS', 'thickness']);
    const radiusRaw = SpecificationPartsService._pickExternalValue(row, ['RADIUS', 'radius']);
    const angleRaw = SpecificationPartsService._pickExternalValue(row, ['ANGLE', 'angle']);
    const length = lengthRaw !== undefined && lengthRaw !== null && lengthRaw !== ''
      ? Number(lengthRaw)
      : null;
    const width = widthRaw !== undefined && widthRaw !== null && widthRaw !== ''
      ? Number(widthRaw)
      : null;
    const thickness = thicknessRaw !== undefined && thicknessRaw !== null && thicknessRaw !== ''
      ? Number(thicknessRaw)
      : null;
    const radius = radiusRaw !== undefined && radiusRaw !== null && radiusRaw !== ''
      ? Number(radiusRaw)
      : null;
    const angle = angleRaw !== undefined && angleRaw !== null && angleRaw !== ''
      ? Number(angleRaw)
      : null;
    const profileDem = sourceMode === 'blocks'
      ? [row.WH, row.WT, row.FH, row.FT].every((value) => value !== undefined && value !== null && String(value).trim() !== '')
        ? [row.WH, row.WT, row.FH, row.FT].map((value) => String(value).trim()).join('/')
        : null
      : null;
    const nestIdRaw = sourceMode === 'blocks'
      ? SpecificationPartsService._pickExternalValue(row, ['NEST_ID', 'nest_id'])
      : null;
    const strgroupRaw = sourceMode === 'blocks'
      ? SpecificationPartsService._pickExternalValue(row, ['STRGROUP', 'strgroup'])
      : null;
    const cogXRaw = SpecificationPartsService._pickExternalValue(row, ['COG_X', 'cog_x', 'cogX', 'ELEMENT_COG_X', 'element_cog_x', 'X_COG', 'x_cog']);
    const cogYRaw = SpecificationPartsService._pickExternalValue(row, ['COG_Y', 'cog_y', 'cogY', 'ELEMENT_COG_Y', 'element_cog_y', 'Y_COG', 'y_cog']);
    const cogZRaw = SpecificationPartsService._pickExternalValue(row, ['COG_Z', 'cog_z', 'cogZ', 'ELEMENT_COG_Z', 'element_cog_z', 'Z_COG', 'z_cog']);
    const cogX = cogXRaw !== undefined && cogXRaw !== null && cogXRaw !== ''
      ? Number(cogXRaw)
      : null;
    const cogY = cogYRaw !== undefined && cogYRaw !== null && cogYRaw !== ''
      ? Number(cogYRaw)
      : null;
    const cogZ = cogZRaw !== undefined && cogZRaw !== null && cogZRaw !== ''
      ? Number(cogZRaw)
      : null;
    return {
      part_code: partCode,
      part_oid: partOid,
      quantity: Number.isNaN(quantity) ? 1 : quantity,
      total_weight: SpecificationPartsService._pickExternalValue(row, totalWeightKeys) !== null
        ? Number(SpecificationPartsService._pickExternalValue(row, totalWeightKeys))
        : null,
      num_eq_part: SpecificationPartsService._pickExternalValue(row, ['NUM_EQ_PART', 'num_eq_part', 'numEqPart']) !== null
        ? Number(SpecificationPartsService._pickExternalValue(row, ['NUM_EQ_PART', 'num_eq_part', 'numEqPart']))
        : null,
      zone: SpecificationPartsService._pickExternalValue(row, zoneKeys) != null
        ? String(SpecificationPartsService._pickExternalValue(row, zoneKeys)).trim()
        : null,
      stock_code: SpecificationPartsService._pickExternalValue(row, stockCodeKeys) != null
        ? String(SpecificationPartsService._pickExternalValue(row, stockCodeKeys)).trim()
        : null,
      // ASTRUCTURE and SYSTEMS return LENGTH in millimeters; the internal model stores meters.
      length: Number.isNaN(length) ? null : ((sourceMode === 'astructure' || sourceMode === 'systems') && length !== null ? length / 1000 : length),
      width: Number.isNaN(width) ? null : width,
      thickness: Number.isNaN(thickness) ? null : thickness,
      radius: Number.isNaN(radius) ? null : radius,
      angle: Number.isNaN(angle) ? null : angle,
      profile_dem: profileDem,
      nest_id: nestIdRaw !== null && nestIdRaw !== undefined && String(nestIdRaw).trim() !== ''
        ? SpecificationPartsService._toNumberOrNull(nestIdRaw)
        : null,
      cog_x: Number.isNaN(cogX) ? null : cogX,
      cog_y: Number.isNaN(cogY) ? null : cogY,
      cog_z: Number.isNaN(cogZ) ? null : cogZ,
      // These fields are intentionally left empty during import,
      // except tray rows where part_type is fixed to TRAY.
      part_type: partType,
      symmetry: null,
      unit: null,
      sfi_code_id: SpecificationPartsService._toNumberOrNull(
        SpecificationPartsService._pickExternalValue(row, ['SFI_CODE_ID', 'sfi_code_id'])
      ),
      strgroup: strgroupRaw !== null && strgroupRaw !== undefined
        ? String(strgroupRaw).trim() || null
        : null,
      descriptions: sourceMode === 'equipment' || sourceMode === 'tray'
        ? null
        : SpecificationPartsService._pickExternalValue(row, descriptionsKeys) != null
        ? String(SpecificationPartsService._pickExternalValue(row, descriptionsKeys)).trim()
        : null
    };
  }

  static _resolveQuantity(row, material) {
    return SpecificationPartsService._resolveQuantityDetails(row, material);
  }

  static _resolveQuantityDetails(row, material) {
    // Legacy BLOCKS quantity logic.
    // This intentionally keeps the existing behavior for the older import branch.
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

    // BLOCKS follows the generic legacy import rules:
    // - unit 2 means we already have the final weight, so use TOTAL_WEIGHT.
    // - unit 1 means the part is counted by pieces, so prefer NUM_EQ_PART.
    // - unit 3 means the part is counted by length, so use LENGTH.
    // - for every other unit, we derive quantity from TOTAL_WEIGHT / material.weight.
    // - if we cannot calculate anything meaningful, we fall back to the raw quantity
    //   from the payload, and then to 1 as the final safety net.
    if (unitId === 2) {
      return totalWeight !== null
        ? { quantity: totalWeight, calculated: true, reason: null }
        : { quantity: fallbackQuantity, calculated: false, reason: 'TOTAL_WEIGHT is missing, fell back to raw quantity' };
    }

    if (unitId === 1) {
      return row.num_eq_part !== null && row.num_eq_part !== undefined && !Number.isNaN(Number(row.num_eq_part))
        ? { quantity: Number(row.num_eq_part), calculated: true, reason: null }
        : { quantity: fallbackQuantity, calculated: false, reason: 'NUM_EQ_PART is missing, fell back to raw quantity' };
    }

    if (unitId === 3) {
      return row.length !== null && row.length !== undefined && !Number.isNaN(Number(row.length))
        ? { quantity: Number(row.length), calculated: true, reason: null }
        : { quantity: fallbackQuantity, calculated: false, reason: 'LENGTH is missing, fell back to raw quantity' };
    }

    if (totalWeight !== null && materialWeight !== null && materialWeight > 0) {
      return { quantity: totalWeight / materialWeight, calculated: true, reason: null };
    }

    if (totalWeight !== null) {
      return { quantity: totalWeight, calculated: false, reason: 'Material weight is missing or invalid, fell back to TOTAL_WEIGHT' };
    }

    return { quantity: fallbackQuantity, calculated: false, reason: 'TOTAL_WEIGHT and material weight are missing, fell back to raw quantity' };
  }

  static _resolveAstructureQuantity(row, material) {
    return SpecificationPartsService._resolveAstructureQuantityDetails(row, material);
  }

  static _resolveSystemsQuantity(row, material) {
    return SpecificationPartsService._resolveSystemsQuantityDetails(row, material);
  }

  static _resolveEquipmentQuantity(row, material) {
    return SpecificationPartsService._resolveEquipmentQuantityDetails(row, material);
  }

  static _resolveTrayQuantity(row, material) {
    return SpecificationPartsService._resolveTrayQuantityDetails(row, material);
  }

  static _resolveAstructureQuantityDetails(row, material) {
    // ASTRUCTURE quantity logic follows its own unit semantics.
    // We keep this separate so BLOCKS behavior cannot accidentally regress.
    const unitId = material && material.unit_id !== null && material.unit_id !== undefined && !Number.isNaN(Number(material.unit_id))
      ? Number(material.unit_id)
      : null;
    const totalWeight = row.total_weight !== null && row.total_weight !== undefined && !Number.isNaN(Number(row.total_weight))
      ? Number(row.total_weight)
      : null;
    const length = row.length !== null && row.length !== undefined && !Number.isNaN(Number(row.length))
      ? Number(row.length)
      : null;
    const materialWeight = material && material.weight !== null && material.weight !== undefined && !Number.isNaN(Number(material.weight))
      ? Number(material.weight)
      : null;

    // ASTRUCTURE uses unit-specific quantity rules instead of the generic
    // FORAN/BLOCKS behavior:
    // - unit 2 means the part is tracked by weight, so we store the incoming WEIGHT.
    // - unit 1 means the part is counted as a single item, so quantity is always 1.
    // - unit 3 means the part is tracked by length, so we store the incoming LENGTH.
    // - for every other unit, we approximate quantity by dividing WEIGHT by the
    //   material's unit weight from equipment_materials.weight.
    // The final fallback is 1, so we never write a null quantity into the table.
    if (unitId === 2) {
      return totalWeight !== null
        ? { quantity: totalWeight, calculated: true, reason: null }
        : { quantity: 1, calculated: false, reason: 'WEIGHT is missing, fell back to 1' };
    }

    if (unitId === 1) {
      return { quantity: 1, calculated: true, reason: null };
    }

    if (unitId === 3) {
      return length !== null
        ? { quantity: length, calculated: true, reason: null }
        : { quantity: 1, calculated: false, reason: 'LENGTH is missing, fell back to 1' };
    }

    // Same fallback principle as in BLOCKS, but without the piece-count branch:
    // if the incoming payload already carries WEIGHT and material weight is known,
    // we can derive quantity from that relationship. Otherwise we keep 1.
    if (totalWeight !== null && materialWeight !== null && materialWeight > 0) {
      return { quantity: totalWeight / materialWeight, calculated: true, reason: null };
    }

    return { quantity: 1, calculated: false, reason: 'WEIGHT or material weight is missing, fell back to 1' };
  }

  static _resolveSystemsQuantityDetails(row, material) {
    // SYSTEMS quantity follows unit semantics:
    // - unit 1 is a single item,
    // - unit 2 stores incoming WEIGHT directly,
    // - unit 3 stores incoming LENGTH,
    // - other units are derived from incoming WEIGHT and material unit weight.
    const unitId = material && material.unit_id !== null && material.unit_id !== undefined && !Number.isNaN(Number(material.unit_id))
      ? Number(material.unit_id)
      : null;
    const length = row.length !== null && row.length !== undefined && !Number.isNaN(Number(row.length))
      ? Number(row.length)
      : null;
    const totalWeight = row.total_weight !== null && row.total_weight !== undefined && !Number.isNaN(Number(row.total_weight))
      ? Number(row.total_weight)
      : null;
    const materialWeight = material && material.weight !== null && material.weight !== undefined && !Number.isNaN(Number(material.weight))
      ? Number(material.weight)
      : null;

    if (unitId === 1) {
      return { quantity: 1, calculated: true, reason: null };
    }

    if (unitId === 2) {
      return totalWeight !== null
        ? { quantity: totalWeight, calculated: true, reason: null }
        : { quantity: 1, calculated: false, reason: 'WEIGHT is missing, fell back to 1' };
    }

    if (unitId === 3) {
      return length !== null
        ? { quantity: length, calculated: true, reason: null }
        : { quantity: 1, calculated: false, reason: 'LENGTH is missing, fell back to 1' };
    }

    if (totalWeight !== null && materialWeight !== null && materialWeight > 0) {
      return { quantity: totalWeight / materialWeight, calculated: true, reason: null };
    }

    if (totalWeight !== null) {
      return { quantity: totalWeight, calculated: false, reason: 'Material weight is missing or invalid, fell back to WEIGHT' };
    }

    return { quantity: 1, calculated: false, reason: 'WEIGHT and material weight are missing, fell back to 1' };
  }

  static _resolveEquipmentQuantityDetails(row, material) {
    // EQUIPMENT rows always represent a single equipment item.
    return { quantity: 1, calculated: true, reason: null };
  }

  static _resolveTrayQuantityDetails(row, material) {
    // TRAY rows use LENGTH for unit 3 and otherwise derive quantity from WEIGHT.
    const unitId = material && material.unit_id !== null && material.unit_id !== undefined && !Number.isNaN(Number(material.unit_id))
      ? Number(material.unit_id)
      : null;
    const length = row.length !== null && row.length !== undefined && !Number.isNaN(Number(row.length))
      ? Number(row.length)
      : null;
    const totalWeight = row.total_weight !== null && row.total_weight !== undefined && !Number.isNaN(Number(row.total_weight))
      ? Number(row.total_weight)
      : null;
    const materialWeight = material && material.weight !== null && material.weight !== undefined && !Number.isNaN(Number(material.weight))
      ? Number(material.weight)
      : null;

    if (unitId === 3) {
      return length !== null
        ? { quantity: length, calculated: true, reason: null }
        : { quantity: 1, calculated: false, reason: 'LENGTH is missing, fell back to 1' };
    }

    if (totalWeight !== null && materialWeight !== null && materialWeight > 0) {
      return { quantity: totalWeight / materialWeight, calculated: true, reason: null };
    }

    if (totalWeight !== null) {
      return { quantity: totalWeight, calculated: false, reason: 'Material weight is missing or invalid, fell back to WEIGHT' };
    }

    return { quantity: 1, calculated: false, reason: 'WEIGHT and material weight are missing, fell back to 1' };
  }

  static _resolveForanBaseUrl(requestBaseUrl = null, runtimeUrl = null) {
    // Resolve the base URL for external import services with sane fallbacks.
    const configured = String(runtimeUrl || '').trim();
    if (configured) return configured;
    const fallback = String(requestBaseUrl || '').trim();
    if (fallback) return fallback;
    const host = String(process.env.FORAN_SERVICE_HOST || '127.0.0.1').trim() || '127.0.0.1';
    const port = String(process.env.FORAN_SERVICE_PORT || process.env.PORT || 3000).trim() || '3000';
    return `http://${host}:${port}`;
  }

  static _buildForanRequestUrl(template, projectCode, oid, sourceCode = null, requestBaseUrl = null, runtimeUrl = null) {
    // BLOCKS uses project_code placeholders and may append oid as a query param.
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

  static _buildBlocksRequestUrl(template, projectCode, oid, sourceCode = null, requestBaseUrl = null, runtimeUrl = null) {
    // Compatibility wrapper so callers can speak in BLOCKS terminology.
    return SpecificationPartsService._buildForanRequestUrl(template, projectCode, oid, sourceCode, requestBaseUrl, runtimeUrl);
  }

  static _buildAstructureRequestUrl(template, schemaName, oid, requestBaseUrl = null, runtimeUrl = null) {
    // ASTRUCTURE uses schemaName and a dedicated oid query parameter shape.
    return SpecificationPartsService._buildSchemaOidRequestUrl(
      template,
      schemaName,
      oid,
      'oid',
      null,
      requestBaseUrl,
      runtimeUrl
    );
  }

  static _buildSystemsRequestUrl(template, schemaName, oid, requestBaseUrl = null, runtimeUrl = null) {
    // SYSTEMS uses schemaName and a dedicated system_oid query parameter shape.
    return SpecificationPartsService._buildSchemaOidRequestUrl(
      template,
      schemaName,
      oid,
      'system_oid',
      null,
      requestBaseUrl,
      runtimeUrl
    );
  }

  static _buildEquipmentBySystemRequestUrl(template, schemaName, oid, dataConnector = null, requestBaseUrl = null, runtimeUrl = null) {
    // EQUIPMENT BY SYSTEM follows the same schemaName pattern as SYSTEMS, but with a different path and query key.
    const preparedTemplate = SpecificationPartsService._applyEquipmentTemplateParams(template, dataConnector);
    return SpecificationPartsService._buildSchemaOidRequestUrl(
      preparedTemplate,
      schemaName,
      oid,
      'system_oid',
      SpecificationPartsService._buildEquipmentQueryParams(dataConnector),
      requestBaseUrl,
      runtimeUrl
    );
  }

  static _buildEquipmentByZoneRequestUrl(template, schemaName, oid, dataConnector = null, requestBaseUrl = null, runtimeUrl = null) {
    // EQUIPMENT BY ZONE follows the same schemaName pattern as SYSTEMS, but with a zone_oid query key.
    const preparedTemplate = SpecificationPartsService._applyEquipmentTemplateParams(template, dataConnector);
    return SpecificationPartsService._buildSchemaOidRequestUrl(
      preparedTemplate,
      schemaName,
      oid,
      'zone_oid',
      SpecificationPartsService._buildEquipmentQueryParams(dataConnector),
      requestBaseUrl,
      runtimeUrl
    );
  }

  static _buildTrayBySystemRequestUrl(template, schemaName, oid, requestBaseUrl = null, runtimeUrl = null) {
    // TRAY BY SYSTEM uses the schemaName pattern without the equipment-specific filter/mechanical query params.
    return SpecificationPartsService._buildSchemaOidRequestUrl(
      template,
      schemaName,
      oid,
      'system_oid',
      null,
      requestBaseUrl,
      runtimeUrl
    );
  }

  static _buildTrayByZoneRequestUrl(template, schemaName, oid, requestBaseUrl = null, runtimeUrl = null) {
    // TRAY BY ZONE uses the schemaName pattern without the equipment-specific filter/mechanical query params.
    return SpecificationPartsService._buildSchemaOidRequestUrl(
      template,
      schemaName,
      oid,
      'zone_oid',
      null,
      requestBaseUrl,
      runtimeUrl
    );
  }

  static _applyEquipmentTemplateParams(template, dataConnector = null) {
    // Equipment source templates may still carry eq_type/eq_mech placeholders in the path string.
    const eqType = SpecificationPartsService._normalizeText(dataConnector && dataConnector.eq_type);
    const eqMech = SpecificationPartsService._normalizeText(dataConnector && dataConnector.eq_mech);
    return String(template || '')
      .replaceAll('{eq_type}', encodeURIComponent(eqType))
      .replaceAll('{eq_mech}', encodeURIComponent(eqMech));
  }

  static _buildEquipmentQueryParams(dataConnector = null) {
    // Equipment endpoints need extra query params stored alongside the data connector.
    return {
      filter: SpecificationPartsService._normalizeText(dataConnector && dataConnector.eq_type),
      mechanical: SpecificationPartsService._normalizeText(dataConnector && dataConnector.eq_mech)
    };
  }

  static _buildSchemaOidRequestUrl(template, schemaName, oid, queryParamName, extraQueryParams = null, requestBaseUrl = null, runtimeUrl = null) {
    let relativePath = String(template || '')
      .replaceAll('{schemaName}', encodeURIComponent(String(schemaName || '').trim()))
      .replaceAll('{oid}', encodeURIComponent(String(oid || '')));
    for (const [key, value] of Object.entries(extraQueryParams || {})) {
      const normalizedValue = value === null || value === undefined ? '' : String(value);
      relativePath = relativePath.replaceAll(`{${key}}`, encodeURIComponent(normalizedValue));
    }

    const url = new URL(relativePath, SpecificationPartsService._resolveForanBaseUrl(requestBaseUrl, runtimeUrl));
    if (!url.searchParams.has(queryParamName) && oid !== undefined && oid !== null && String(oid).trim() !== '') {
      url.searchParams.set(queryParamName, String(oid));
    }
    for (const [key, value] of Object.entries(extraQueryParams || {})) {
      const normalizedValue = value === null || value === undefined ? '' : String(value);
      if (normalizedValue.trim() === '') {
        url.searchParams.delete(key);
        continue;
      }
      if (url.searchParams.has(key)) continue;
      url.searchParams.set(key, normalizedValue);
    }
    return url.toString();
  }

  static _resolveConnectorImportStrategy(connectorRow) {
    // Source connector metadata decides which import branch to use.
    const sourceConnector = connectorRow && connectorRow.source_connector ? connectorRow.source_connector : null;
    const code = SpecificationPartsService._normalizeLowerText(sourceConnector && sourceConnector.code);
    const name = SpecificationPartsService._normalizeLowerText(sourceConnector && sourceConnector.name);
    if (code === 'as_oid' || name === 'astructure') {
      return {
        key: 'astructure',
        sourceValue: 'foran'
      };
    }

    if (code === 'system_oid' || name === 'systems') {
      return {
        key: 'systems',
        sourceValue: 'systems'
      };
    }

    if (code === 'equip_by_system_oid' || name.startsWith('equipment by system')) {
      return {
        key: 'equip_by_system_oid',
        sourceValue: 'foran'
      };
    }

    if (code === 'equip_by_zone_oid' || name.startsWith('equipment by zone')) {
      return {
        key: 'equip_by_zone_oid',
        sourceValue: 'foran'
      };
    }

    if (code === 'tray_by_system_oid' || name.startsWith('tray by system')) {
      return {
        key: 'tray_by_system_oid',
        sourceValue: 'foran'
      };
    }

    if (code === 'tray_by_zone_oid' || name.startsWith('tray by zone')) {
      return {
        key: 'tray_by_zone_oid',
        sourceValue: 'foran'
      };
    }

    return {
      key: 'blocks',
      sourceValue: 'foran'
    };
  }

  static async _fetchForanParts(payloadMeta, runtimeToken = null, sourceLabel = 'FORAN') {
    // Shared fetch helper for both external services; the source label keeps errors readable.
    const headers = {
      Accept: 'application/json'
    };
    const token = String(runtimeToken || '').trim();
    if (token) headers.Authorization = `Bearer ${token}`;

    let response;
    try {
      response = await fetch(payloadMeta.url, { method: 'GET', headers });
    } catch (cause) {
      const causeMessage = cause && cause.message ? cause.message : 'fetch failed';
      const baseUrlHint = String(process.env.FORAN_SERVICE_URL || '').trim()
        ? ''
        : ' Set FORAN_SERVICE_URL to an internal FORAN backend URL in production.';
      const err = new Error(`${sourceLabel} request failed for ${payloadMeta.url}: ${causeMessage}${baseUrlHint}`);
      err.statusCode = 502;
      err.cause = cause;
      err.url = payloadMeta.url;
      throw err;
    }
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      const err = new Error(`${sourceLabel} request failed with status ${response.status}${text ? `: ${text.slice(0, 300)}` : ''}`);
      err.statusCode = response.status >= 400 && response.status < 600 ? response.status : 502;
      err.url = payloadMeta.url;
      throw err;
    }
    return await response.json();
  }

  static async _resolveMaterialMap(rows = [], projectId = null) {
    // Materials are keyed by stock_code because import rows only know the external stock identifier.
    const stockCodes = [...new Set(
      (rows || [])
        .map((row) => row && row.stock_code)
        .filter((value) => value !== null && value !== undefined && String(value).trim() !== '')
        .map((value) => String(value).trim().toUpperCase())
    )];

    if (stockCodes.length === 0) return new Map();
    const numericProjectId = Number(projectId);
    if (!numericProjectId || Number.isNaN(numericProjectId)) return new Map();

    const res = await pool.query(
      `SELECT DISTINCT ON (UPPER(m.stock_code))
        m.id, m.stock_code, m.weight, m.unit_id, emp.part_code_def
       FROM equipment_materials m
       JOIN equipment_materials_projects emp
         ON emp.equipment_material_id = m.id
       LEFT JOIN statements s
         ON s.id = emp.statement_id
       WHERE UPPER(m.stock_code) = ANY($1::text[])
         AND s.project_id = $2
       ORDER BY UPPER(m.stock_code), emp.id DESC, m.id DESC`,
      [stockCodes, numericProjectId]
    );
    return new Map((res.rows || []).map((row) => [String(row.stock_code).trim().toUpperCase(), {
      id: row.id,
      weight: row.weight,
      unit_id: row.unit_id,
      part_code_def: row.part_code_def ?? null
      }]));
  }

  static async _resolveGlobalMaterialMap(rows = []) {
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
      unit_id: row.unit_id,
      part_code_def: row.part_code_def ?? null
    }]));
  }

  static async _ensureForanSourceAllowed(client = pool, sourceValues = []) {
    // Keep the source check in sync with the import branches.
    // We use NOT VALID here so existing historical rows do not block the current import path.
    const allowedSources = [
      'import',
      'manual',
      'foran',
      'blocks',
      'astructure',
      'systems',
      'kit',
      ...new Set((sourceValues || [])
        .map((value) => SpecificationPartsService._normalizeLowerText(value))
        .filter((value) => value !== ''))
    ];
    const allowedSourcesSql = allowedSources
      .map((value) => `'${String(value).replace(/'/g, "''")}'`)
      .join(', ');
    await client.query(
      `ALTER TABLE IF EXISTS public.specification_parts
         DROP CONSTRAINT IF EXISTS specification_parts_source_check`
    );
    await client.query(
      `ALTER TABLE IF EXISTS public.specification_parts
         ADD CONSTRAINT specification_parts_source_check
         CHECK (source::text = ANY (ARRAY[${allowedSourcesSql}]::text[])) NOT VALID`
    );
  }

  static async list(query = {}, actor) {
    // Standard listing endpoint for already stored parts.
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
    // Manual creation keeps the current user as the author.
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, 'specifications.update');
    if (!allowed) { const err = new Error('Forbidden'); err.statusCode = 403; throw err; }
    if (!fields.specification_version_id) { const err = new Error('Missing fields'); err.statusCode = 400; throw err; }
    const versionId = Number(fields.specification_version_id);
    await SpecificationPartsService._assertVersionUnlocked(versionId);
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

    if (SpecificationPartsService._toBoolean(fields.cog_from_parent)) {
      const parentId = Number(fields.parent_id);
      if (!parentId || Number.isNaN(parentId)) {
        const err = new Error('parent_id is required when cog_from_parent is true');
        err.statusCode = 400;
        throw err;
      }

      const parent = await SpecificationPart.findById(parentId);
      if (!parent) {
        const err = new Error('Parent specification part not found');
        err.statusCode = 404;
        throw err;
      }

      fields.cog_x = parent.cog_x ?? null;
      fields.cog_y = parent.cog_y ?? null;
      fields.cog_z = parent.cog_z ?? null;
    }

    fields.created_by = actor.id;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await SpecificationPartsService._ensureForanSourceAllowed(client, ['kit']);

      const created = await SpecificationPart.create(fields, client);
      if (!created) {
        const err = new Error('Not found');
        err.statusCode = 404;
        throw err;
      }

      await SpecificationPartsService._syncLinkedKitPartsForParent(created, specification.project_id, actor.id, client);
      await SpecificationVersion.touch(created.specification_version_id, actor.id, client);

      await client.query('COMMIT');

      const meta = await SpecificationPartsService._resolveVersionMeta({ specification_version_id: created.specification_version_id }, [created]);
      return {
        ...meta,
        data: SpecificationPartsService._stripVersionMeta(SpecificationPartsService._withComputedTotalWeight(created))
      };
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {}
      throw err;
    } finally {
      client.release();
    }
  }

  static async update(fields, actor) {
    // Update a single part row and preserve the version metadata.
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, 'specifications.update');
    if (!allowed) { const err = new Error('Forbidden'); err.statusCode = 403; throw err; }
    const id = Number(fields && fields.id);
    if (!id || Number.isNaN(id)) { const err = new Error('Missing fields'); err.statusCode = 400; throw err; }

    const existing = await SpecificationPart.findById(id);
    if (!existing) { const err = new Error('Not found'); err.statusCode = 404; throw err; }
    await SpecificationPartsService._assertVersionUnlocked(Number(existing.specification_version_id));
    if (fields.specification_version_id !== undefined && fields.specification_version_id !== null) {
      const targetVersionId = Number(fields.specification_version_id);
      if (!Number.isNaN(targetVersionId) && targetVersionId > 0 && targetVersionId !== Number(existing.specification_version_id)) {
        await SpecificationPartsService._assertVersionUnlocked(targetVersionId);
      }
    }

    const updated = await SpecificationPart.update(id, fields);
    if (!updated) { const err = new Error('Not found'); err.statusCode = 404; throw err; }
    await SpecificationVersion.touch(updated.specification_version_id, actor.id);
    const meta = await SpecificationPartsService._resolveVersionMeta({ specification_version_id: updated.specification_version_id }, [updated]);
    return {
      ...meta,
      data: SpecificationPartsService._stripVersionMeta(SpecificationPartsService._withComputedTotalWeight(updated))
    };
  }

  static async updateDrawingAddressById(id, drawingAddress, actor) {
    // Narrow update used by external integrations that only know the specification part id.
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, 'specifications.update');
    if (!allowed) { const err = new Error('Forbidden'); err.statusCode = 403; throw err; }

    const normalizedId = Number(id);
    if (!normalizedId || Number.isNaN(normalizedId)) {
      const err = new Error('Invalid id');
      err.statusCode = 400;
      throw err;
    }

    const normalizedDrawingAddress = drawingAddress === undefined || drawingAddress === null
      ? ''
      : String(drawingAddress).trim();
    if (!normalizedDrawingAddress) {
      const err = new Error('Invalid drawing_address');
      err.statusCode = 400;
      throw err;
    }

    const existing = await SpecificationPart.findById(normalizedId);
    if (!existing) {
      const err = new Error('Not found');
      err.statusCode = 404;
      throw err;
    }
    await SpecificationPartsService._assertVersionUnlocked(Number(existing.specification_version_id));

    const updated = await SpecificationPart.updateDrawingAddressById(normalizedId, normalizedDrawingAddress);
    if (!updated) {
      const err = new Error('Not found');
      err.statusCode = 404;
      throw err;
    }

    return SpecificationPartsService._stripVersionMeta(SpecificationPartsService._withComputedTotalWeight(updated));
  }

  static async delete(id, actor) {
    // Soft-delete first, hard-delete only when the schema allows it.
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, 'specifications.update');
    if (!allowed) { const err = new Error('Forbidden'); err.statusCode = 403; throw err; }

    const partId = Number(id);
    if (!partId || Number.isNaN(partId)) {
      const err = new Error('Missing fields');
      err.statusCode = 400;
      throw err;
    }

    const existing = await SpecificationPart.findById(partId);
    if (!existing) {
      const err = new Error('Not found');
      err.statusCode = 404;
      throw err;
    }
    await SpecificationPartsService._assertVersionUnlocked(Number(existing.specification_version_id));

    const ok = await SpecificationPart.softDelete(partId);
    if (!ok) {
      const err = new Error('Not found');
      err.statusCode = 404;
      throw err;
    }

    await SpecificationVersion.touch(existing.specification_version_id, actor.id);

    return { success: true };
  }

  static async calculateCenterOfMassBySpecificationVersionId(specificationVersionId, actor) {
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, 'specifications.view');
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

    const rows = await SpecificationPart.list({ specification_version_id: versionId });
    if (!rows || rows.length === 0) {
      const err = new Error('Specification version has no parts');
      err.statusCode = 404;
      throw err;
    }

    const result = SpecificationPartsService._calculateCenterOfMass(rows);
    return {
      specification_version_id: versionId,
      specification_id: version.specification_id,
      ...result,
    };
  }
}

module.exports = SpecificationPartsService;
