const pool = require('../connection');
const SpecificationPart = require('./SpecificationPart');

class SpecificationVersion {
  static _normalizeComparisonSource(value) {
    const source = value === null || value === undefined ? '' : String(value).trim().toLowerCase();
    return source || 'manual';
  }

  static _normalizeComparisonText(value) {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    return text ? text.toUpperCase() : null;
  }

  static _partComparisonIdentity(part) {
    const source = SpecificationVersion._normalizeComparisonSource(part && part.source);
    const stockCode = SpecificationVersion._normalizeComparisonText(
      part && part.material && part.material.stock_code !== undefined
        ? part.material.stock_code
        : null
    );

    if (source === 'foran') {
      const partOid = part && part.part_oid !== undefined && part.part_oid !== null && String(part.part_oid).trim() !== ''
        ? String(part.part_oid).trim()
        : null;
      return {
        source,
        key: `foran|${partOid || ''}|${stockCode || ''}`,
        part_oid: partOid,
        part_code: null,
        stock_code: part && part.material && part.material.stock_code !== undefined && part.material.stock_code !== null
          ? String(part.material.stock_code).trim() || null
          : null
      };
    }

    if (source === 'kit') {
      const partCode = part && part.part_code !== undefined && part.part_code !== null && String(part.part_code).trim() !== ''
        ? String(part.part_code).trim()
        : null;
      return {
        source,
        key: `kit|${partCode || ''}|${stockCode || ''}`,
        part_oid: null,
        part_code: partCode,
        stock_code: part && part.material && part.material.stock_code !== undefined && part.material.stock_code !== null
          ? String(part.material.stock_code).trim() || null
          : null
      };
    }

    const partCode = part && part.part_code !== undefined && part.part_code !== null && String(part.part_code).trim() !== ''
      ? String(part.part_code).trim()
      : null;
    return {
      source,
      key: `manual|${partCode || ''}|${stockCode || ''}`,
      part_oid: null,
      part_code: partCode,
      stock_code: part && part.material && part.material.stock_code !== undefined && part.material.stock_code !== null
        ? String(part.material.stock_code).trim() || null
        : null
    };
  }

  static _quantityForComparison(part) {
    const quantity = part && part.quantity !== undefined && part.quantity !== null
      ? Number(part.quantity)
      : 1;
    return Number.isFinite(quantity) ? quantity : 0;
  }

  static _aggregatePartsForComparison(parts = []) {
    const map = new Map();

    (parts || []).forEach((part, index) => {
      const identity = SpecificationVersion._partComparisonIdentity(part);
      const quantity = SpecificationVersion._quantityForComparison(part);
      const existing = map.get(identity.key);

      if (existing) {
        existing.quantity += quantity;
        existing.count += 1;
        return;
      }

      map.set(identity.key, {
        key: identity.key,
        source: identity.source,
        part_oid: identity.part_oid,
        part_code: identity.part_code,
        stock_code: identity.stock_code,
        material: part && part.material ? part.material : null,
        quantity,
        count: 1,
        order: index
      });
    });

    return map;
  }

  static _comparisonItem(entry, extra = {}) {
    return {
      order: entry.order,
      key: entry.key,
      source: entry.source,
      part_oid: entry.part_oid,
      part_code: entry.part_code,
      stock_code: entry.stock_code,
      material: entry.material,
      quantity: entry.quantity,
      ...extra
    };
  }

  static async compareVersions(baseVersionId, compareToVersionId, executor = pool) {
    const [baseVersion, compareVersion] = await Promise.all([
      SpecificationVersion.findById(baseVersionId),
      SpecificationVersion.findById(compareToVersionId)
    ]);

    if (!baseVersion) {
      const err = new Error('Specification version not found');
      err.statusCode = 404;
      throw err;
    }

    if (!compareVersion) {
      const err = new Error('Specification version to compare not found');
      err.statusCode = 404;
      throw err;
    }

    if (Number(baseVersion.specification_id) !== Number(compareVersion.specification_id)) {
      const err = new Error('Specification versions must belong to the same specification');
      err.statusCode = 400;
      throw err;
    }

    const [baseParts, compareParts] = await Promise.all([
      SpecificationPart.findBySpecificationVersionId(Number(baseVersionId), executor),
      SpecificationPart.findBySpecificationVersionId(Number(compareToVersionId), executor)
    ]);

    const baseMap = SpecificationVersion._aggregatePartsForComparison(baseParts);
    const compareMap = SpecificationVersion._aggregatePartsForComparison(compareParts);
    const changed = [];
    const created = [];
    const deleted = [];

    for (const entry of baseMap.values()) {
      const compareEntry = compareMap.get(entry.key);
      if (!compareEntry) {
        deleted.push(SpecificationVersion._comparisonItem(entry));
        continue;
      }

      if (Number(entry.quantity) !== Number(compareEntry.quantity)) {
        changed.push(
          SpecificationVersion._comparisonItem(entry, {
            before_quantity: entry.quantity,
            after_quantity: compareEntry.quantity,
            quantity_delta: compareEntry.quantity - entry.quantity
          })
        );
      }
    }

    for (const entry of compareMap.values()) {
      if (baseMap.has(entry.key)) continue;
      created.push(SpecificationVersion._comparisonItem(entry));
    }

    const sortByOrder = (a, b) => {
      const orderA = Number.isFinite(a.order) ? a.order : 0;
      const orderB = Number.isFinite(b.order) ? b.order : 0;
      if (orderA !== orderB) return orderA - orderB;
      return String(a.key).localeCompare(String(b.key));
    };

    const normalizeOutput = (items, type) => items
      .sort(sortByOrder)
      .map((item) => {
        const { order, count, ...rest } = item;
        if (type === 'changed') {
          return {
            key: rest.key,
            source: rest.source,
            part_oid: rest.part_oid,
            part_code: rest.part_code,
            material: rest.material,
            before_quantity: rest.before_quantity,
            after_quantity: rest.after_quantity,
            quantity_delta: rest.quantity_delta
          };
        }
        return {
          key: rest.key,
          source: rest.source,
          part_oid: rest.part_oid,
          part_code: rest.part_code,
          material: rest.material,
          quantity: rest.quantity
        };
      });

    const changedItems = normalizeOutput(changed, 'changed');
    const createdItems = normalizeOutput(created, 'created');
    const deletedItems = normalizeOutput(deleted, 'deleted');

    return {
      specification_id: Number(baseVersion.specification_id),
      base_version: baseVersion,
      compare_to_version: compareVersion,
      summary: {
        changed: changedItems.length,
        new: createdItems.length,
        deleted: deletedItems.length,
        unchanged: Math.max(baseMap.size - changedItems.length - deletedItems.length, 0)
      },
      changed: changedItems,
      new: createdItems,
      deleted: deletedItems
    };
  }

  static async list(filters = {}) {
    const { specification_id, page = 1, limit } = filters;
    const offset = limit ? (page - 1) * limit : 0;
    const where = [];
    const values = [];
    let idx = 1;
    if (specification_id) { where.push(`sv.specification_id = $${idx++}`); values.push(specification_id); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    let q = `SELECT sv.id, sv.specification_id, sv.version, sv.notes, sv.created_by, cu.first_name AS created_by_first_name, cu.last_name AS created_by_last_name, cu.middle_name AS created_by_middle_name, sv.created_at
      , sv."lock"
      , sv.updated_by, uu.first_name AS updated_by_first_name, uu.last_name AS updated_by_last_name, uu.middle_name AS updated_by_middle_name, sv.updated_at
      FROM specification_version sv
      LEFT JOIN users cu ON cu.id = sv.created_by
      LEFT JOIN users uu ON uu.id = sv.updated_by
      ${whereSql} ORDER BY sv.id DESC`;
    if (limit != null) {
      q += ` LIMIT $${idx++} OFFSET $${idx}`;
      values.push(limit, offset);
    } else if (offset) {
      q += ` OFFSET $${idx}`;
      values.push(offset);
    }
    const res = await pool.query(q, values);
    return res.rows;
  }

  static async findLatestBySpecificationId(specificationId, executor = pool) {
    const q = `SELECT sv.id, sv.specification_id, sv.version, sv.notes, sv.created_by, cu.first_name AS created_by_first_name, cu.last_name AS created_by_last_name, cu.middle_name AS created_by_middle_name, sv.created_at,
      sv."lock",
      sv.updated_by, uu.first_name AS updated_by_first_name, uu.last_name AS updated_by_last_name, uu.middle_name AS updated_by_middle_name, sv.updated_at
      FROM specification_version sv
      LEFT JOIN users cu ON cu.id = sv.created_by
      LEFT JOIN users uu ON uu.id = sv.updated_by
      WHERE sv.specification_id = $1
      ORDER BY sv.id DESC
      LIMIT 1`;
    const res = await executor.query(q, [specificationId]);
    return res.rows[0] || null;
  }

  static async findById(id) {
    const q = `SELECT sv.id, sv.specification_id, sv.version, sv.notes, sv.created_by, cu.first_name AS created_by_first_name, cu.last_name AS created_by_last_name, cu.middle_name AS created_by_middle_name, sv.created_at,
      sv."lock",
      sv.updated_by, uu.first_name AS updated_by_first_name, uu.last_name AS updated_by_last_name, uu.middle_name AS updated_by_middle_name, sv.updated_at
      FROM specification_version sv
      LEFT JOIN users cu ON cu.id = sv.created_by
      LEFT JOIN users uu ON uu.id = sv.updated_by
      WHERE sv.id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    return res.rows[0] || null;
  }

  static async create(fields, executor = pool) {
    const q = `INSERT INTO specification_version (specification_id, version, notes, created_by, updated_by, "lock") VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, specification_id, version, notes, created_by, updated_by, "lock", created_at, updated_at`;
    const vals = [fields.specification_id, fields.version, fields.notes || null, fields.created_by, fields.updated_by || null, fields.lock ?? false];
    const res = await executor.query(q, vals);
    return res.rows[0];
  }

  static async touch(id, updatedBy, executor = pool) {
    const q = `UPDATE specification_version
      SET updated_by = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, specification_id, version, notes, created_by, updated_by, "lock", created_at, updated_at`;
    const res = await executor.query(q, [id, updatedBy ?? null]);
    return res.rows[0] || null;
  }

  static async update(id, fields) {
    const parts = [];
    const values = [];
    let idx = 1;
    ['version', 'notes', 'updated_by', 'lock'].forEach((k) => {
      if (fields[k] !== undefined) {
        parts.push(k === 'lock' ? `"lock" = $${idx++}` : `${k} = $${idx++}`);
        values.push(fields[k]);
      }
    });
    if (parts.length === 0) return await SpecificationVersion.findById(id);
    const q = `UPDATE specification_version SET ${parts.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING id, specification_id, version, notes, created_by, updated_by, "lock", created_at, updated_at`;
    values.push(id);
    const res = await pool.query(q, values);
    return res.rows[0] || null;
  }

  static async delete(id) {
    const existing = await SpecificationVersion.findById(id);
    if (!existing) return false;
    if (existing.lock) {
      const err = new Error('Specification version is locked');
      err.statusCode = 423;
      throw err;
    }
    const q = `DELETE FROM specification_version WHERE id = $1`;
    const res = await pool.query(q, [id]);
    return res.rowCount > 0;
  }

  static async hasAnyPartsBySpecificationId(specificationId, executor = pool) {
    const q = `
      SELECT EXISTS(
        SELECT 1
        FROM specification_version sv
        JOIN specification_parts sp ON sp.specification_version_id = sv.id
        WHERE sv.specification_id = $1
      ) AS has_parts
    `;
    const res = await executor.query(q, [specificationId]);
    return Boolean(res.rows[0] && res.rows[0].has_parts);
  }
}

module.exports = SpecificationVersion;
