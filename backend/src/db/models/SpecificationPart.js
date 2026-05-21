const pool = require('../connection');

class SpecificationPart {
  static _selectColumns(alias = null) {
    const prefix = alias ? `${alias}.` : '';
    return [
      `${prefix}id`,
      `${prefix}specification_version_id`,
      `${prefix}parent_id`,
      `${prefix}part_code`,
      `${prefix}material_id`,
      `${prefix}quantity`,
      `${prefix}qty`,
      `${prefix}zone`,
      `${prefix}part_type`,
      `${prefix}length`,
      `${prefix}width`,
      `${prefix}thickness`,
      `${prefix}symmetry`,
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
          ELSE jsonb_build_object('id', uo.id, 'name', uo.name, 'kei', uo.kei)
        END,
        true
      ) AS material,
      json_build_object('id', cu.id, 'username', cu.username, 'first_name', cu.first_name, 'last_name', cu.last_name, 'middle_name', cu.middle_name, 'full_name', concat_ws(' ', cu.last_name, cu.first_name, cu.middle_name), 'email', cu.email, 'avatar_id', cu.avatar_id) AS created_by,
      row_to_json(sv.*) AS specification_version
      FROM specification_parts sp
      LEFT JOIN equipment_materials m ON m.id = sp.material_id
      LEFT JOIN units uo ON uo.id = m.unit_id
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

  static async findById(id) {
    const q = `SELECT ${SpecificationPart._selectColumns('sp')},
      jsonb_set(
        to_jsonb(m),
        '{unit}',
        CASE
          WHEN uo.id IS NULL THEN 'null'::jsonb
          ELSE jsonb_build_object('id', uo.id, 'name', uo.name, 'kei', uo.kei)
        END,
        true
      ) AS material,
      json_build_object('id', cu.id, 'username', cu.username, 'first_name', cu.first_name, 'last_name', cu.last_name, 'middle_name', cu.middle_name, 'full_name', concat_ws(' ', cu.last_name, cu.first_name, cu.middle_name), 'email', cu.email, 'avatar_id', cu.avatar_id) AS created_by,
      row_to_json(sv.*) AS specification_version
      FROM specification_parts sp
      LEFT JOIN equipment_materials m ON m.id = sp.material_id
      LEFT JOIN units uo ON uo.id = m.unit_id
      LEFT JOIN users cu ON cu.id = sp.created_by
      LEFT JOIN specification_version sv ON sv.id = sp.specification_version_id
      WHERE sp.id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    return res.rows[0] || null;
  }

  static async findByIds(ids = []) {
    const uniqueIds = [...new Set((ids || []).map((id) => Number(id)).filter((id) => !Number.isNaN(id) && id > 0))];
    if (uniqueIds.length === 0) return [];
    const q = `SELECT ${SpecificationPart._selectColumns('sp')},
      jsonb_set(
        to_jsonb(m),
        '{unit}',
        CASE
          WHEN uo.id IS NULL THEN 'null'::jsonb
          ELSE jsonb_build_object('id', uo.id, 'name', uo.name, 'kei', uo.kei)
        END,
        true
      ) AS material,
      json_build_object('id', cu.id, 'username', cu.username, 'first_name', cu.first_name, 'last_name', cu.last_name, 'middle_name', cu.middle_name, 'full_name', concat_ws(' ', cu.last_name, cu.first_name, cu.middle_name), 'email', cu.email, 'avatar_id', cu.avatar_id) AS created_by,
      row_to_json(sv.*) AS specification_version
      FROM specification_parts sp
      LEFT JOIN equipment_materials m ON m.id = sp.material_id
      LEFT JOIN units uo ON uo.id = m.unit_id
      LEFT JOIN users cu ON cu.id = sp.created_by
      LEFT JOIN specification_version sv ON sv.id = sp.specification_version_id
      WHERE sp.id = ANY($1::int[])
      ORDER BY sp.id`;
    const res = await pool.query(q, [uniqueIds]);
    return res.rows;
  }

  static async create(fields) {
    const q = `INSERT INTO specification_parts (specification_version_id, parent_id, part_code, material_id, quantity, qty, zone, length, width, thickness, symmetry, unit, part_type, descriptions, cog_x, cog_y, cog_z, created_by, source) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING id`;
    const vals = [
      fields.specification_version_id,
      fields.parent_id || null,
      fields.part_code || null,
      fields.material_id || null,
      fields.quantity || 1,
      fields.qty ?? null,
      fields.zone || null,
      SpecificationPart._normalizeNullable(fields.length),
      SpecificationPart._normalizeNullable(fields.width),
      SpecificationPart._normalizeNullable(fields.thickness),
      fields.symmetry || null,
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
    const parts = [];
    const values = [];
    let idx = 1;
    ['parent_id','part_code','material_id','quantity','qty','zone','length','width','thickness','symmetry','unit','part_type','descriptions','cog_x','cog_y','cog_z','source'].forEach((k) => {
      if (fields[k] !== undefined) {
        parts.push(`${k} = $${idx++}`);
        const normalized = ['length', 'width', 'thickness'].includes(k)
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

  static async softDelete(id) {
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
