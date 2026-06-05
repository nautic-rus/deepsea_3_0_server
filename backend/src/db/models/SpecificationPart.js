const pool = require('../connection');

class SpecificationPart {
  static async _ensureSchema() {
    if (!this._schemaEnsurePromise) {
      this._schemaEnsurePromise = (async () => {
        await pool.query(`ALTER TABLE IF EXISTS public.specification_parts ADD COLUMN IF NOT EXISTS nest_id bigint`);
        await pool.query(`ALTER TABLE IF EXISTS public.specification_parts ADD COLUMN IF NOT EXISTS strgroup text`);
        await pool.query(`ALTER TABLE IF EXISTS public.specification_parts ADD COLUMN IF NOT EXISTS profile_dem text`);
      })();
    }
    return this._schemaEnsurePromise;
  }

  static _selectColumns(alias = null) {
    const prefix = alias ? `${alias}.` : '';
    return [
      `${prefix}id`,
      `${prefix}specification_version_id`,
      `${prefix}parent_id`,
      `${prefix}part_code`,
      `${prefix}part_oid`,
      `${prefix}drawing_address`,
      `${prefix}material_id`,
      `${prefix}sfi_code_id`,
      `${prefix}quantity`,
      `${prefix}qty`,
      `${prefix}zone`,
      `${prefix}profile_dem`,
      `${prefix}nest_id`,
      `${prefix}part_type`,
      `${prefix}length`,
      `${prefix}width`,
      `${prefix}thickness`,
      `${prefix}radius`,
      `${prefix}angle`,
      `${prefix}symmetry`,
      `${prefix}strgroup`,
      `${prefix}descriptions`,
      `${prefix}cog_x`,
      `${prefix}cog_y`,
      `${prefix}cog_z`,
      `${prefix}source`,
      `${prefix}created_at`,
    ].join(', ');
  }

  static _normalizeNullable(value) {
    return value === '' ? null : value;
  }

  static async list(filters = {}) {
    await SpecificationPart._ensureSchema();
    const { specification_version_id, page = 1, limit } = filters;
    const offset = limit ? (page - 1) * limit : 0;
    const where = [];
    const values = [];
    let idx = 1;
    if (specification_version_id) { where.push(`specification_version_id = $${idx++}`); values.push(specification_version_id); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    let q = `SELECT ${SpecificationPart._selectColumns('sp')},
      jsonb_set(
        to_jsonb(m),
        '{unit}',
        CASE
          WHEN uo.id IS NULL THEN 'null'::jsonb
          ELSE jsonb_build_object('id', uo.id, 'name', uo.name, 'symbol', uo.symbol, 'kei', uo.kei)
        END,
        true
      ) AS material,
      CASE
        WHEN sc.id IS NULL THEN NULL
        ELSE jsonb_build_object('id', sc.id, 'code', sc.code, 'name_ru', sc.name_ru, 'name_en', sc.name_en)
      END AS sfi_code,
      json_build_object('id', cu.id, 'username', cu.username, 'first_name', cu.first_name, 'last_name', cu.last_name, 'middle_name', cu.middle_name, 'full_name', concat_ws(' ', cu.last_name, cu.first_name, cu.middle_name), 'email', cu.email, 'avatar_id', cu.avatar_id) AS created_by,
      row_to_json(sv.*) AS specification_version
      FROM specification_parts sp
      LEFT JOIN equipment_materials m ON m.id = sp.material_id
      LEFT JOIN units uo ON uo.id = m.unit_id
      LEFT JOIN sfi_codes sc ON sc.id = sp.sfi_code_id
      LEFT JOIN users cu ON cu.id = sp.created_by
      LEFT JOIN specification_version sv ON sv.id = sp.specification_version_id
      ${whereSql} ORDER BY sp.id`;
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

  static async findBySpecificationVersionId(specificationVersionId, executor = pool) {
    await SpecificationPart._ensureSchema();
    const q = `SELECT ${SpecificationPart._selectColumns('sp')},
      jsonb_set(
        to_jsonb(m),
        '{unit}',
        CASE
          WHEN uo.id IS NULL THEN 'null'::jsonb
          ELSE jsonb_build_object('id', uo.id, 'name', uo.name, 'symbol', uo.symbol, 'kei', uo.kei)
        END,
        true
      ) AS material,
      CASE
        WHEN sc.id IS NULL THEN NULL
        ELSE jsonb_build_object('id', sc.id, 'code', sc.code, 'name_ru', sc.name_ru, 'name_en', sc.name_en)
      END AS sfi_code,
      json_build_object('id', cu.id, 'username', cu.username, 'first_name', cu.first_name, 'last_name', cu.last_name, 'middle_name', cu.middle_name, 'full_name', concat_ws(' ', cu.last_name, cu.first_name, cu.middle_name), 'email', cu.email, 'avatar_id', cu.avatar_id) AS created_by,
      row_to_json(sv.*) AS specification_version
      FROM specification_parts sp
      LEFT JOIN equipment_materials m ON m.id = sp.material_id
      LEFT JOIN units uo ON uo.id = m.unit_id
      LEFT JOIN sfi_codes sc ON sc.id = sp.sfi_code_id
      LEFT JOIN users cu ON cu.id = sp.created_by
      LEFT JOIN specification_version sv ON sv.id = sp.specification_version_id
      WHERE sp.specification_version_id = $1
      ORDER BY sp.id`;
    const res = await executor.query(q, [specificationVersionId]);
    return res.rows;
  }

  static async cloneToSpecificationVersion(sourceVersionId, targetVersionId, createdBy, executor = pool) {
    const sourceParts = await SpecificationPart.findBySpecificationVersionId(sourceVersionId, executor);
    if (!sourceParts || sourceParts.length === 0) return [];

    const insertSql = `INSERT INTO specification_parts
      (specification_version_id, parent_id, part_code, part_oid, drawing_address, material_id, sfi_code_id, quantity, qty, zone, profile_dem, nest_id, length, width, thickness, radius, angle, symmetry, strgroup, unit, part_type, descriptions, cog_x, cog_y, cog_z, created_by, source)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)
      RETURNING id`;

    const insertedIds = [];
    const idMap = new Map();

    for (const part of sourceParts) {
      const vals = [
        targetVersionId,
        null,
        part.part_code || null,
        part.part_oid ?? null,
        part.drawing_address || null,
        part.material_id || null,
        part.sfi_code_id || null,
        part.quantity ?? 1,
        part.qty ?? null,
        part.zone || null,
        part.profile_dem || null,
        SpecificationPart._normalizeNullable(part.nest_id),
        SpecificationPart._normalizeNullable(part.length),
        SpecificationPart._normalizeNullable(part.width),
        SpecificationPart._normalizeNullable(part.thickness),
        SpecificationPart._normalizeNullable(part.radius),
        SpecificationPart._normalizeNullable(part.angle),
        part.symmetry || null,
        part.strgroup || null,
        part.unit || null,
        part.part_type || null,
        part.descriptions || null,
        part.cog_x ?? null,
        part.cog_y ?? null,
        part.cog_z ?? null,
        createdBy,
        part.source || 'manual'
      ];
      const res = await executor.query(insertSql, vals);
      const insertedId = res.rows[0] && res.rows[0].id ? Number(res.rows[0].id) : null;
      if (insertedId) {
        insertedIds.push(insertedId);
        idMap.set(Number(part.id), insertedId);
      }
    }

    for (const part of sourceParts) {
      if (part.parent_id === null || part.parent_id === undefined) continue;
      const newId = idMap.get(Number(part.id));
      if (!newId) continue;
      const newParentId = idMap.get(Number(part.parent_id)) || null;
      await executor.query(
        `UPDATE specification_parts SET parent_id = $2 WHERE id = $1`,
        [newId, newParentId]
      );
    }

    return insertedIds;
  }

  static async findById(id) {
    await SpecificationPart._ensureSchema();
    const q = `SELECT ${SpecificationPart._selectColumns('sp')},
      jsonb_set(
        to_jsonb(m),
        '{unit}',
        CASE
          WHEN uo.id IS NULL THEN 'null'::jsonb
          ELSE jsonb_build_object('id', uo.id, 'name', uo.name, 'symbol', uo.symbol, 'kei', uo.kei)
        END,
        true
      ) AS material,
      CASE
        WHEN sc.id IS NULL THEN NULL
        ELSE jsonb_build_object('id', sc.id, 'code', sc.code, 'name_ru', sc.name_ru, 'name_en', sc.name_en)
      END AS sfi_code,
      json_build_object('id', cu.id, 'username', cu.username, 'first_name', cu.first_name, 'last_name', cu.last_name, 'middle_name', cu.middle_name, 'full_name', concat_ws(' ', cu.last_name, cu.first_name, cu.middle_name), 'email', cu.email, 'avatar_id', cu.avatar_id) AS created_by,
      row_to_json(sv.*) AS specification_version
      FROM specification_parts sp
      LEFT JOIN equipment_materials m ON m.id = sp.material_id
      LEFT JOIN units uo ON uo.id = m.unit_id
      LEFT JOIN sfi_codes sc ON sc.id = sp.sfi_code_id
      LEFT JOIN users cu ON cu.id = sp.created_by
      LEFT JOIN specification_version sv ON sv.id = sp.specification_version_id
      WHERE sp.id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    return res.rows[0] || null;
  }

  static async findByIds(ids = []) {
    await SpecificationPart._ensureSchema();
    const uniqueIds = [...new Set((ids || []).map((id) => Number(id)).filter((id) => !Number.isNaN(id) && id > 0))];
    if (uniqueIds.length === 0) return [];
    const q = `SELECT ${SpecificationPart._selectColumns('sp')},
      jsonb_set(
        to_jsonb(m),
        '{unit}',
        CASE
          WHEN uo.id IS NULL THEN 'null'::jsonb
          ELSE jsonb_build_object('id', uo.id, 'name', uo.name, 'symbol', uo.symbol, 'kei', uo.kei)
        END,
        true
      ) AS material,
      CASE
        WHEN sc.id IS NULL THEN NULL
        ELSE jsonb_build_object('id', sc.id, 'code', sc.code, 'name_ru', sc.name_ru, 'name_en', sc.name_en)
      END AS sfi_code,
      json_build_object('id', cu.id, 'username', cu.username, 'first_name', cu.first_name, 'last_name', cu.last_name, 'middle_name', cu.middle_name, 'full_name', concat_ws(' ', cu.last_name, cu.first_name, cu.middle_name), 'email', cu.email, 'avatar_id', cu.avatar_id) AS created_by,
      row_to_json(sv.*) AS specification_version
      FROM specification_parts sp
      LEFT JOIN equipment_materials m ON m.id = sp.material_id
      LEFT JOIN units uo ON uo.id = m.unit_id
      LEFT JOIN sfi_codes sc ON sc.id = sp.sfi_code_id
      LEFT JOIN users cu ON cu.id = sp.created_by
      LEFT JOIN specification_version sv ON sv.id = sp.specification_version_id
      WHERE sp.id = ANY($1::int[])
      ORDER BY sp.id`;
    const res = await pool.query(q, [uniqueIds]);
    return res.rows;
  }

  static async create(fields) {
    await SpecificationPart._ensureSchema();
    const q = `INSERT INTO specification_parts (specification_version_id, parent_id, part_code, part_oid, drawing_address, material_id, sfi_code_id, quantity, qty, zone, profile_dem, nest_id, length, width, thickness, radius, angle, symmetry, strgroup, unit, part_type, descriptions, cog_x, cog_y, cog_z, created_by, source) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27) RETURNING id`;
    const vals = [
      fields.specification_version_id,
      fields.parent_id || null,
      fields.part_code || null,
      fields.part_oid ?? null,
      fields.drawing_address || null,
      fields.material_id || null,
      fields.sfi_code_id || null,
      fields.quantity || 1,
      fields.qty ?? null,
      fields.zone || null,
      fields.profile_dem || null,
      SpecificationPart._normalizeNullable(fields.nest_id),
      SpecificationPart._normalizeNullable(fields.length),
      SpecificationPart._normalizeNullable(fields.width),
      SpecificationPart._normalizeNullable(fields.thickness),
      SpecificationPart._normalizeNullable(fields.radius),
      SpecificationPart._normalizeNullable(fields.angle),
      fields.symmetry || null,
      fields.strgroup || null,
      fields.unit || null,
      fields.part_type || null,
      fields.descriptions || null,
      fields.cog_x ?? null,
      fields.cog_y ?? null,
      fields.cog_z ?? null,
      fields.created_by,
      fields.source || 'manual'
    ];
    const res = await pool.query(q, vals);
    const inserted = res.rows[0];
    if (!inserted) return null;
    return await SpecificationPart.findById(inserted.id);
  }

  static async update(id, fields) {
    await SpecificationPart._ensureSchema();
    const parts = [];
    const values = [];
    let idx = 1;
    ['parent_id','part_code','part_oid','drawing_address','material_id','sfi_code_id','quantity','qty','zone','profile_dem','nest_id','length','width','thickness','radius','angle','symmetry','strgroup','unit','part_type','descriptions','cog_x','cog_y','cog_z','source'].forEach((k) => {
      if (fields[k] !== undefined) {
        parts.push(`${k} = $${idx++}`);
        const normalized = ['nest_id', 'length', 'width', 'thickness', 'radius', 'angle'].includes(k)
          ? SpecificationPart._normalizeNullable(fields[k])
          : fields[k];
        values.push(normalized);
      }
    });
    if (parts.length === 0) return await SpecificationPart.findById(id);
    const q = `UPDATE specification_parts SET ${parts.join(', ')} WHERE id = $${idx} RETURNING ${SpecificationPart._selectColumns()}`;
    values.push(id);
    const res = await pool.query(q, values);
    const updated = res.rows[0] || null;
    if (!updated) return null;
    return await SpecificationPart.findById(updated.id);
  }

  static async updateDrawingAddressById(id, drawingAddress) {
    await SpecificationPart._ensureSchema();
    const q = `UPDATE specification_parts sp
    SET drawing_address = $2
    WHERE sp.id = $1
    RETURNING ${SpecificationPart._selectColumns('sp')}`;
    const res = await pool.query(q, [id, drawingAddress]);
    return res.rows[0] || null;
  }

  static async softDelete(id) {
    await SpecificationPart._ensureSchema();
    try {
      const q = `UPDATE specification_parts SET is_active = false WHERE id = $1`;
      const res = await pool.query(q, [id]);
      if (res.rowCount > 0) return true;
    } catch (err) {}
    const q2 = `DELETE FROM specification_parts WHERE id = $1`;
    const res2 = await pool.query(q2, [id]);
    return res2.rowCount > 0;
  }
}

module.exports = SpecificationPart;
