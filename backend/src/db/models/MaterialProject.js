const pool = require('../connection');

class MaterialProject {
  static _toInt(v) {
    if (v === null || typeof v === 'undefined' || v === '') return undefined;
    const n = Number(v);
    return Number.isNaN(n) ? undefined : n;
  }

  static _toIntArray(v) {
    if (v === null || typeof v === 'undefined' || v === '') return [];
    const arr = Array.isArray(v) ? v : String(v).split(',');
    return arr.map((x) => Number(x)).filter((n) => !Number.isNaN(n));
  }

  static _formatRow(r) {
    if (!r) return null;
    return {
      id: Number(r.id),
      equipment_material_id: r.equipment_material_id === null ? null : Number(r.equipment_material_id),
      project_id: r.project_id === null ? null : Number(r.project_id),
      statement_id: r.statement_id === null ? null : Number(r.statement_id),
      shipments_id: r.shipments_id === null ? null : Number(r.shipments_id),
      created_at: r.created_at,
      material: r.material_id === null ? null : {
        id: Number(r.material_id),
        stock_code: r.material_stock_code || null,
        name: r.material_name || null,
        description: r.material_description || null,
        type: r.material_type || null,
        status: r.material_status || null
      },
      project: r.project_id === null ? null : {
        id: Number(r.project_id),
        code: r.project_code || null,
        name: r.project_name || null
      },
      statement: r.statement_id === null ? null : {
        id: Number(r.statement_id),
        code: r.statement_code || null,
        name: r.statement_name || null,
        project_id: r.project_id === null ? null : Number(r.project_id)
      },
      shipments: r.shipments_id === null ? null : {
        id: Number(r.shipments_id),
        supplier_id: r.shipment_supplier_id === null ? null : Number(r.shipment_supplier_id),
        code: r.shipment_code || null,
        model: r.shipment_model || null,
        manufacturer: r.shipment_manufacturer || null,
        description: r.shipment_description || null
      }
    };
  }

  static _baseQuery() {
    return `
      SELECT
        emp.id,
        emp.equipment_material_id,
        emp.statement_id,
        emp.shipments_id,
        emp.created_at,
        m.id AS material_id,
        m.stock_code AS material_stock_code,
        m.name AS material_name,
        m.description AS material_description,
        m.type AS material_type,
        m.status AS material_status,
        s.project_id,
        s.code AS statement_code,
        s.name AS statement_name,
        p.code AS project_code,
        p.name AS project_name,
        sh.supplier_id AS shipment_supplier_id,
        sh.code AS shipment_code,
        sh.model AS shipment_model,
        sh.manufacturer AS shipment_manufacturer,
        sh.description AS shipment_description
      FROM equipment_materials_projects emp
      LEFT JOIN equipment_materials m ON m.id = emp.equipment_material_id
      LEFT JOIN statements s ON s.id = emp.statement_id
      LEFT JOIN projects p ON p.id = s.project_id
      LEFT JOIN shipments sh ON sh.id = emp.shipments_id
    `;
  }

  static async list(filters = {}) {
    const { page = 1, limit, allowed_project_ids } = filters;
    const equipmentMaterialId = MaterialProject._toInt(filters.equipment_material_id !== undefined ? filters.equipment_material_id : filters.material_id);
    const projectIds = MaterialProject._toIntArray(filters.project_id);
    const statementIds = MaterialProject._toIntArray(filters.statement_id);
    const shipmentsId = MaterialProject._toInt(filters.shipments_id);

    const offset = limit ? (page - 1) * limit : 0;
    const where = [];
    const values = [];
    let idx = 1;

    if (equipmentMaterialId !== undefined) { where.push(`emp.equipment_material_id = $${idx++}`); values.push(equipmentMaterialId); }
    if (statementIds.length > 0) { where.push(`emp.statement_id = ANY($${idx++}::int[])`); values.push(statementIds); }
    if (shipmentsId !== undefined) { where.push(`emp.shipments_id = $${idx++}`); values.push(shipmentsId); }
    if (projectIds.length > 0) {
      where.push(`s.project_id = ANY($${idx++}::int[])`);
      values.push(projectIds);
    }
    if (Array.isArray(allowed_project_ids) && allowed_project_ids.length > 0) {
      const allowedIds = allowed_project_ids.map((v) => Number(v)).filter((n) => !Number.isNaN(n));
      if (allowedIds.length === 0) return [];
      where.push(`s.project_id = ANY($${idx++}::int[])`);
      values.push(allowedIds);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    let q = `${MaterialProject._baseQuery()} ${whereSql} ORDER BY emp.id DESC`;
    if (limit != null) {
      q += ` LIMIT $${idx++} OFFSET $${idx}`;
      values.push(limit, offset);
    } else if (offset) {
      q += ` OFFSET $${idx}`;
      values.push(offset);
    }

    const res = await pool.query(q, values);
    return (res.rows || []).map((r) => MaterialProject._formatRow(r));
  }

  static async findById(id) {
    const q = `${MaterialProject._baseQuery()} WHERE emp.id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    return MaterialProject._formatRow((res.rows || [])[0] || null);
  }

  static async create(fields) {
    const q = `INSERT INTO equipment_materials_projects (equipment_material_id, statement_id, shipments_id) VALUES ($1,$2,$3) RETURNING id`;
    const vals = [fields.equipment_material_id, fields.statement_id, fields.shipments_id || null];
    const res = await pool.query(q, vals);
    if (!res.rows[0]) return null;
    return await MaterialProject.findById(res.rows[0].id);
  }

  static async update(id, fields) {
    const parts = [];
    const values = [];
    let idx = 1;
    ['equipment_material_id', 'statement_id', 'shipments_id'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); values.push(fields[k]); }
    });
    if (parts.length === 0) return await MaterialProject.findById(id);
    const q = `UPDATE equipment_materials_projects SET ${parts.join(', ')} WHERE id = $${idx} RETURNING id`;
    values.push(id);
    const res = await pool.query(q, values);
    if (!res.rows[0]) return null;
    return await MaterialProject.findById(id);
  }

  static async remove(id) {
    const res = await pool.query('DELETE FROM equipment_materials_projects WHERE id = $1', [id]);
    return res.rowCount > 0;
  }
}

module.exports = MaterialProject;
