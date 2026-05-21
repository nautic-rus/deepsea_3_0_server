const pool = require('../connection');

class Material {
  static _formatUserDisplay(lastName, firstName, middleName) {
    return [lastName, firstName, middleName]
      .map((part) => (part == null ? '' : String(part).trim()))
      .filter(Boolean)
      .join(' ') || null;
  }

  static _toIntArray(v) {
    if (v === null || typeof v === 'undefined' || v === '') return [];
    const arr = Array.isArray(v) ? v : String(v).split(',');
    return arr.map((x) => Number(x)).filter((n) => !Number.isNaN(n));
  }

  static _toBoolean(v) {
    if (v === true || v === false) return v;
    if (v === 1 || v === '1') return true;
    if (v === 0 || v === '0') return false;
    if (typeof v === 'string') {
      const normalized = v.trim().toLowerCase();
      if (normalized === 'true') return true;
      if (normalized === 'false') return false;
    }
    return false;
  }

  static _formatBaseRow(r) {
    if (!r) return null;
    return {
      id: r.id,
      stock_code: r.stock_code,
      name: r.name,
      description: r.description,
      directory: r.directory_id ? { id: r.directory_id, name: r.directory_name } : null,
      unit: r.unit_id ? { id: r.unit_id, name: r.unit_name, kei: r.unit_kei ?? null } : null,
      weight: r.weight,
      sfi_code: r.sfi_code_id ? { id: r.sfi_code_id, code: r.sfi_code_code || null, name_ru: r.sfi_code_name_ru || null, name_en: r.sfi_code_name_en || null } : null,
      type: r.type,
      status: r.status,
      created_by: r.created_by ? { id: r.created_by, name: Material._formatUserDisplay(r.created_by_last_name, r.created_by_first_name, r.created_by_middle_name), avatar_id: r.created_by_avatar_id || null } : null,
      created_at: r.created_at,
      updated_by: r.updated_by ? { id: r.updated_by, name: Material._formatUserDisplay(r.updated_by_last_name, r.updated_by_first_name, r.updated_by_middle_name), avatar_id: r.updated_by_avatar_id || null } : null,
      updated_at: r.updated_at,
    };
  }

  static async _attachStatementUsage(materials) {
    if (!Array.isArray(materials) || materials.length === 0) return materials;

    const materialIds = [...new Set(materials.map((m) => Number(m && m.id)).filter((n) => !Number.isNaN(n)))];
    if (materialIds.length === 0) {
      for (const material of materials) {
        material.statements = [];
      }
      return materials;
    }

    const countQ = `
      WITH linked_statements AS (
        SELECT DISTINCT
          emp.equipment_material_id,
          emp.statement_id,
          st.project_id
        FROM equipment_materials_projects emp
        JOIN statements st ON st.id = emp.statement_id
        WHERE emp.equipment_material_id = ANY($1::int[])
          AND emp.statement_id IS NOT NULL
      ),
      latest_versions AS (
        SELECT DISTINCT ON (ls.equipment_material_id, ls.statement_id, spec.id)
          ls.equipment_material_id,
          ls.statement_id,
          spec.id AS specification_id,
          sv.id AS specification_version_id
        FROM linked_statements ls
        JOIN specification spec ON spec.project_id = ls.project_id
        JOIN specification_version sv ON sv.specification_id = spec.id
        ORDER BY
          ls.equipment_material_id,
          ls.statement_id,
          spec.id,
          sv.created_at DESC NULLS LAST,
          sv.id DESC
      )
      SELECT
        lv.equipment_material_id,
        lv.statement_id,
        COALESCE(
          SUM(CASE WHEN sp.id IS NULL THEN 0 ELSE COALESCE(sp.quantity, 1) END),
          0
        )::numeric AS statement_parts_count
      FROM latest_versions lv
      LEFT JOIN specification_parts sp
        ON sp.specification_version_id = lv.specification_version_id
       AND sp.material_id = lv.equipment_material_id
      GROUP BY lv.equipment_material_id, lv.statement_id
    `;
    const statementsQ = `
      SELECT
        p.equipment_material_id,
        p.id AS binding_id,
        p.statement_id,
        p.shipments_id,
        p.created_at,
        s.code AS statement_code,
        s.name AS statement_name,
        s.description AS statement_description,
        s.project_id AS statement_project_id,
        pr.code AS project_code,
        pr.name AS project_name,
        sh.id AS shipment_id,
        sh.supplier_id AS shipment_supplier_id,
        sh.code AS shipment_code,
        sup.name AS supplier_name,
        sup.description AS supplier_description
      FROM equipment_materials_projects p
      LEFT JOIN statements s ON p.statement_id = s.id
      LEFT JOIN projects pr ON pr.id = s.project_id
      LEFT JOIN shipments sh ON p.shipments_id = sh.id
      LEFT JOIN suppliers sup ON sup.id = sh.supplier_id
      WHERE p.equipment_material_id = ANY($1::int[])
      ORDER BY p.equipment_material_id, p.id DESC
    `;

    const [countRes, statementsRes] = await Promise.all([
      pool.query(countQ, [materialIds]),
      pool.query(statementsQ, [materialIds]),
    ]);

    const countMap = new Map();
    for (const row of (countRes.rows || [])) {
      const materialId = Number(row.equipment_material_id);
      const statementId = row.statement_id === null ? null : Number(row.statement_id);
      if (!countMap.has(materialId)) countMap.set(materialId, new Map());
      countMap.get(materialId).set(statementId, Number(row.statement_parts_count) || 0);
    }

    const statementsByMaterial = new Map();
    for (const row of (statementsRes.rows || [])) {
      const materialId = Number(row.equipment_material_id);
      if (!statementsByMaterial.has(materialId)) statementsByMaterial.set(materialId, []);
      const statementId = row.statement_id === null ? null : Number(row.statement_id);
      const materialCounts = countMap.get(materialId);
      const statementPartsCount = materialCounts ? (materialCounts.get(statementId) || 0) : 0;
      statementsByMaterial.get(materialId).push({
        id: row.statement_id || null,
        code: row.statement_code || null,
        name: row.statement_name || null,
        binding_id: row.binding_id ?? row.id ?? null,
        equipment_material_project_id: row.binding_id ?? row.id ?? null,
        created_at: row.created_at,
        statement_parts_count: statementPartsCount,
        project: row.statement_project_id ? { id: row.statement_project_id, code: row.project_code || null, name: row.project_name || null } : null,
        shipments: row.shipment_id ? {
          id: row.shipment_id,
          supplier_id: row.shipment_supplier_id || null,
          code: row.shipment_code || null,
          supplier: row.shipment_supplier_id ? { id: row.shipment_supplier_id, name: row.supplier_name || null, description: row.supplier_description || null } : null
        } : null
      });
    }

    for (const material of materials) {
      const materialId = Number(material.id);
      material.statements = statementsByMaterial.get(materialId) || [];
    }

    return materials;
  }

  static async _attachStatements(materials) {
    if (!Array.isArray(materials) || materials.length === 0) return materials;

    const materialIds = [...new Set(materials.map((m) => Number(m && m.id)).filter((n) => !Number.isNaN(n)))];
    if (materialIds.length === 0) {
      for (const material of materials) {
        material.statements = [];
      }
      return materials;
    }

    const statementsQ = `
      SELECT
        p.equipment_material_id,
        p.id AS binding_id,
        s.id AS statement_id,
        s.code AS statement_code,
        s.name AS statement_name
      FROM equipment_materials_projects p
      JOIN statements s ON p.statement_id = s.id
      WHERE p.equipment_material_id = ANY($1::int[])
      ORDER BY p.equipment_material_id, p.id DESC
    `;

    const statementsRes = await pool.query(statementsQ, [materialIds]);

    const statementsByMaterial = new Map();
    for (const row of (statementsRes.rows || [])) {
      const materialId = Number(row.equipment_material_id);
      if (!statementsByMaterial.has(materialId)) statementsByMaterial.set(materialId, []);
      statementsByMaterial.get(materialId).push({
        id: row.statement_id || null,
        code: row.statement_code || null,
        name: row.statement_name || null,
        binding_id: row.binding_id ?? row.id ?? null,
      });
    }

    for (const material of materials) {
      const materialId = Number(material.id);
      material.statements = statementsByMaterial.get(materialId) || [];
    }

    return materials;
  }

  static async list(filters = {}) {
    const { directory_id, unit_id, shipment_id, type, status, project_id, allowed_project_ids, page = 1, limit, search, load_statements } = filters;
    const offset = limit ? (page - 1) * limit : 0;
    const where = [];
    const values = [];
    let idx = 1;

    const directoryIds = Material._toIntArray(directory_id);
    let directoryScopeSql = '';
    if (directoryIds.length > 0) {
      directoryScopeSql = `
        WITH RECURSIVE directory_scope AS (
          SELECT md.id, md.parent_id
          FROM equipment_materials_directories md
          WHERE md.id = ANY($${idx++}::int[])

          UNION ALL

          SELECT child.id, child.parent_id
          FROM equipment_materials_directories child
          JOIN directory_scope ds ON child.parent_id = ds.id
        )
      `;
      values.push(directoryIds);
      where.push(`EXISTS (
        SELECT 1
        FROM directory_scope ds
        WHERE ds.id = m.directory_id
      )`);
    }

    if (unit_id) { where.push(`m.unit_id = $${idx++}`); values.push(unit_id); }
    if (type) { where.push(`m.type = $${idx++}`); values.push(type); }
    if (status) { where.push(`m.status = $${idx++}`); values.push(status); }
    if (search) { where.push(`(m.name ILIKE $${idx} OR m.description ILIKE $${idx} OR m.stock_code ILIKE $${idx})`); values.push(`%${search}%`); idx++; }
    if (shipment_id) { where.push(`EXISTS (SELECT 1 FROM shipment_materials sh WHERE sh.material_id = m.id AND sh.shipment_id = $${idx++})`); values.push(shipment_id); }
    if (project_id !== undefined && project_id !== null) {
      const projectIds = Array.isArray(project_id)
        ? project_id.map(p => Number(p)).filter(p => !Number.isNaN(p))
        : [Number(project_id)].filter(p => !Number.isNaN(p));
      if (projectIds.length === 0) return [];
      where.push(`EXISTS (
        SELECT 1
        FROM equipment_materials_projects emp
        JOIN statements s ON s.id = emp.statement_id
        WHERE emp.equipment_material_id = m.id
          AND s.project_id = ANY($${idx++}::int[])
      )`);
      values.push(projectIds);
    }
    if (Array.isArray(allowed_project_ids) && allowed_project_ids.length > 0) {
      const projectIds = allowed_project_ids.map(p => Number(p)).filter(p => !Number.isNaN(p));
      if (projectIds.length === 0) return [];
      where.push(`EXISTS (
        SELECT 1
        FROM equipment_materials_projects emp
        JOIN statements s ON s.id = emp.statement_id
        WHERE emp.equipment_material_id = m.id
          AND s.project_id = ANY($${idx++}::int[])
      )`);
      values.push(projectIds);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    let q = `${directoryScopeSql} SELECT m.id, m.stock_code, m.name, m.description, m.directory_id, d.name AS directory_name, m.unit_id, uo.name AS unit_name, uo.kei AS unit_kei, m.weight, m.sfi_code_id, sc.code AS sfi_code_code, sc.name_ru AS sfi_code_name_ru, sc.name_en AS sfi_code_name_en, m.type, m.status, m.created_by, cu.first_name AS created_by_first_name, cu.last_name AS created_by_last_name, cu.middle_name AS created_by_middle_name, cu.avatar_id AS created_by_avatar_id, m.created_at, m.updated_by, uu.first_name AS updated_by_first_name, uu.last_name AS updated_by_last_name, uu.middle_name AS updated_by_middle_name, uu.avatar_id AS updated_by_avatar_id, m.updated_at
        FROM equipment_materials m
      LEFT JOIN equipment_materials_directories d ON m.directory_id = d.id
      LEFT JOIN units uo ON m.unit_id = uo.id
      LEFT JOIN sfi_codes sc ON m.sfi_code_id = sc.id
      LEFT JOIN users cu ON m.created_by = cu.id
      LEFT JOIN users uu ON m.updated_by = uu.id
      ${whereSql} ORDER BY m.id`;
    if (limit != null) {
      q += ` LIMIT $${idx++} OFFSET $${idx}`;
      values.push(limit, offset);
    } else if (offset) {
      q += ` OFFSET $${idx}`;
      values.push(offset);
    }
    const res = await pool.query(q, values);
    const rows = res.rows.map((r) => Material._formatBaseRow(r));
    if (Material._toBoolean(load_statements)) {
      await Material._attachStatements(rows);
    }
    return rows;
  }

  static async findById(id) {
    const q = `SELECT m.id, m.stock_code, m.name, m.description, m.directory_id, d.name AS directory_name, m.unit_id, uo.name AS unit_name, uo.kei AS unit_kei, m.weight, m.sfi_code_id, sc.code AS sfi_code_code, sc.name_ru AS sfi_code_name_ru, sc.name_en AS sfi_code_name_en, m.type, m.status, m.created_by, cu.first_name AS created_by_first_name, cu.last_name AS created_by_last_name, cu.middle_name AS created_by_middle_name, cu.avatar_id AS created_by_avatar_id, m.created_at, m.updated_by, uu.first_name AS updated_by_first_name, uu.last_name AS updated_by_last_name, uu.middle_name AS updated_by_middle_name, uu.avatar_id AS updated_by_avatar_id, m.updated_at
        FROM equipment_materials m
      LEFT JOIN equipment_materials_directories d ON m.directory_id = d.id
      LEFT JOIN units uo ON m.unit_id = uo.id
      LEFT JOIN sfi_codes sc ON m.sfi_code_id = sc.id
      LEFT JOIN users cu ON m.created_by = cu.id
      LEFT JOIN users uu ON m.updated_by = uu.id
      WHERE m.id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    const r = res.rows[0];
    if (!r) return null;
    const row = Material._formatBaseRow(r);
    await Material._attachStatementUsage([row]);
    return row;
  }

  static async findSpecificationsByMaterialId(materialId, filters = {}) {
    const { allowed_project_ids } = filters;
    const values = [Number(materialId)];
    let idx = 2;
    const where = [];

    if (Array.isArray(allowed_project_ids) && allowed_project_ids.length > 0) {
      const projectIds = allowed_project_ids.map(p => Number(p)).filter(p => !Number.isNaN(p));
      if (projectIds.length === 0) return [];
      where.push(`spec.project_id = ANY($${idx++}::int[])`);
      values.push(projectIds);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const q = `WITH latest_versions AS (
        SELECT DISTINCT ON (spec.id)
          spec.id AS specification_id,
          sv.id AS specification_version_id
        FROM specification spec
        JOIN specification_version sv ON sv.specification_id = spec.id
        ${whereSql}
        ORDER BY spec.id, sv.created_at DESC NULLS LAST, sv.id DESC
      )
      SELECT
        spec.id AS specification_id,
        spec.code AS specification_code,
        spec.name AS specification_name,
        spec.description AS specification_description,
        spec.project_id AS specification_project_id,
        spec.document_id AS specification_document_id,
        spec.created_at AS specification_created_at,
        p.code AS project_code,
        p.name AS project_name,
        d.title AS document_name,
        COALESCE(SUM(COALESCE(sp.quantity, 1)), 0)::numeric AS specification_parts_count
      FROM latest_versions lv
      JOIN specification spec ON spec.id = lv.specification_id
      LEFT JOIN projects p ON p.id = spec.project_id
      LEFT JOIN documents d ON d.id = spec.document_id
      LEFT JOIN specification_parts sp
        ON sp.specification_version_id = lv.specification_version_id
       AND sp.material_id = $1
      GROUP BY spec.id, spec.code, spec.name, spec.description, spec.project_id, spec.document_id, spec.created_at, p.code, p.name, d.title
      HAVING COUNT(sp.id) > 0
      ORDER BY spec.id DESC`;
    const res = await pool.query(q, values);
    return (res.rows || []).map((row) => ({
      specification_parts_count: Number(row.specification_parts_count) || 0,
      specification: {
        id: row.specification_id,
        code: row.specification_code,
        name: row.specification_name,
        description: row.specification_description,
        created_at: row.specification_created_at,
        project: row.specification_project_id ? { id: row.specification_project_id, code: row.project_code || null, name: row.project_name || null } : null,
        document: row.specification_document_id ? { id: row.specification_document_id, name: row.document_name || null } : null,
      },
    }));
  }

  static async create(fields) {
    const q = `INSERT INTO equipment_materials (stock_code, name, description, directory_id, unit_id, weight, sfi_code_id, type, status, created_by, updated_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`;
    const vals = [fields.stock_code, fields.name, fields.description || null, fields.directory_id, fields.unit_id || null, fields.weight ?? 0, fields.sfi_code_id || null, fields.type || 'material', fields.status || 'active', fields.created_by, fields.updated_by || null];
    const res = await pool.query(q, vals);
    const newId = res.rows[0] && res.rows[0].id;
    return await Material.findById(newId);
  }

  static async update(id, fields) {
    const parts = [];
    const values = [];
    let idx = 1;
    ['stock_code','name','description','directory_id','unit_id','weight','sfi_code_id','type','status','updated_by'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); values.push(fields[k]); }
    });
    if (parts.length === 0) return await Material.findById(id);
    // always update updated_at timestamp when performing update
    const q = `UPDATE equipment_materials SET ${parts.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING id`;
    values.push(id);
    const res = await pool.query(q, values);
    const updatedId = res.rows[0] && res.rows[0].id;
    return await Material.findById(updatedId);
  }

  static async softDelete(id) {
    try {
      const q = `UPDATE equipment_materials SET is_active = false WHERE id = $1`;
      const res = await pool.query(q, [id]);
      if (res.rowCount > 0) return true;
    } catch (err) {}
    const q2 = `DELETE FROM equipment_materials WHERE id = $1`;
    const res2 = await pool.query(q2, [id]);
    return res2.rowCount > 0;
  }
}

module.exports = Material;
