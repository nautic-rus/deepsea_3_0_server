const pool = require('../connection');

class StatementsPart {
  static baseSelect() {
    return `
      SELECT
        sp.id,
        sp.statements_version_id,
        sp.parent_id,
        sp.specification_part_id,
        sp.quantity,
        CASE
          WHEN m.unit_id = 2 THEN sp.quantity::text
          WHEN COALESCE(m.weight, 0) = 0 THEN '-'
          ELSE (m.weight * sp.quantity)::text
        END AS total_waight,
        jsonb_set(
          to_jsonb(m),
          '{unit}',
          CASE
            WHEN uo.id IS NULL THEN 'null'::jsonb
            ELSE jsonb_build_object(
              'id', uo.id,
              'name', uo.name,
              'kei', uo.kei
            )
          END,
          true
        ) AS material,
        CASE
          WHEN spt.id IS NULL THEN NULL
          ELSE json_build_object(
              'id', spt.id,
              'specification_version_id', spt.specification_version_id,
              'parent_id', spt.parent_id,
              'part_code', spt.part_code,
              'sfi_code_id', spt.sfi_code_id,
              'quantity', spt.quantity,
              'zone', spt.zone,
              'cog_x', spt.cog_x,
              'cog_y', spt.cog_y,
              'cog_z', spt.cog_z,
              'source', spt.source,
              'created_at', spt.created_at,
              'sfi_code', CASE
                WHEN sc.id IS NULL THEN NULL
                ELSE json_build_object(
                  'id', sc.id,
                  'code', sc.code,
                  'name_ru', sc.name_ru,
                  'name_en', sc.name_en
                )
              END,
              'specification_version', row_to_json(sv.*),
              'specification', CASE
                WHEN spec.id IS NULL THEN NULL
              ELSE json_build_object(
                'id', spec.id,
                'project_id', spec.project_id,
                'document_id', spec.document_id,
                'code', spec.code,
                'name', spec.name,
                'description', spec.description,
                'version', (SELECT version FROM specification_version sv2 WHERE sv2.specification_id = spec.id ORDER BY sv2.created_at DESC LIMIT 1),
                'created_by', json_build_object(
                  'id', scu.id,
                  'username', scu.username,
                  'first_name', scu.first_name,
                  'last_name', scu.last_name,
                  'email', scu.email,
                  'avatar_id', scu.avatar_id
                ),
                'created_at', spec.created_at,
                'project', row_to_json(p.*),
                'document', row_to_json(d.*)
              )
            END
          )
        END AS specification_part
    `;
  }

  static async list(filters = {}) {
    const { statements_version_id, specification_part_id, page = 1, limit } = filters;
    const offset = limit ? (page - 1) * limit : 0;
    const where = [];
    const values = [];
    let idx = 1;
    if (statements_version_id) { where.push(`statements_version_id = $${idx++}`); values.push(statements_version_id); }
    if (specification_part_id) { where.push(`specification_part_id = $${idx++}`); values.push(specification_part_id); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    let q = `${StatementsPart.baseSelect()} FROM statements_parts sp
      LEFT JOIN specification_parts spt ON spt.id = sp.specification_part_id
      LEFT JOIN equipment_materials m ON m.id = spt.material_id
      LEFT JOIN units uo ON uo.id = m.unit_id
      LEFT JOIN sfi_codes sc ON sc.id = spt.sfi_code_id
      LEFT JOIN specification_version sv ON sv.id = spt.specification_version_id
      LEFT JOIN specification spec ON spec.id = sv.specification_id
      LEFT JOIN users scu ON scu.id = spec.created_by
      LEFT JOIN projects p ON p.id = spec.project_id
      LEFT JOIN documents d ON d.id = spec.document_id
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
    const q = `${StatementsPart.baseSelect()} FROM statements_parts sp
      LEFT JOIN specification_parts spt ON spt.id = sp.specification_part_id
      LEFT JOIN equipment_materials m ON m.id = spt.material_id
      LEFT JOIN units uo ON uo.id = m.unit_id
      LEFT JOIN sfi_codes sc ON sc.id = spt.sfi_code_id
      LEFT JOIN specification_version sv ON sv.id = spt.specification_version_id
      LEFT JOIN specification spec ON spec.id = sv.specification_id
      LEFT JOIN users scu ON scu.id = spec.created_by
      LEFT JOIN projects p ON p.id = spec.project_id
      LEFT JOIN documents d ON d.id = spec.document_id
      WHERE sp.id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    return res.rows[0] || null;
  }

  static async create(fields) {
    const q = `INSERT INTO statements_parts (statements_version_id, parent_id, specification_part_id, quantity, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING id, statements_version_id, parent_id, specification_part_id, quantity, created_at`;
    const vals = [fields.statements_version_id, fields.parent_id || null, fields.specification_part_id || null, fields.quantity || 1, fields.created_by];
    const res = await pool.query(q, vals);
    const insertedId = res.rows[0] && res.rows[0].id;
    return insertedId ? await StatementsPart.findById(insertedId) : null;
  }

  static async update(id, fields) {
    const parts = [];
    const values = [];
    let idx = 1;
    ['parent_id','specification_part_id','quantity'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); values.push(fields[k]); }
    });
    if (parts.length === 0) return await StatementsPart.findById(id);
    const q = `UPDATE statements_parts SET ${parts.join(', ')} WHERE id = $${idx} RETURNING id`;
    values.push(id);
    const res = await pool.query(q, values);
    const updatedId = res.rows[0] && res.rows[0].id;
    return updatedId ? await StatementsPart.findById(updatedId) : null;
  }

  static async softDelete(id) {
    try {
      const q = `UPDATE statements_parts SET is_active = false WHERE id = $1`;
      const res = await pool.query(q, [id]);
      if (res.rowCount > 0) return true;
    } catch (err) {}
    const q2 = `DELETE FROM statements_parts WHERE id = $1`;
    const res2 = await pool.query(q2, [id]);
    return res2.rowCount > 0;
  }
}

module.exports = StatementsPart;
