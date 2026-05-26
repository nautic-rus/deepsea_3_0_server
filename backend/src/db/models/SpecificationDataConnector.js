const pool = require('../connection');

class SpecificationDataConnector {
  static _rowQuery() {
    return `
      SELECT
        row_to_json(d.*) AS data_connector,
        row_to_json(s.*) AS source_connector,
        row_to_json(p.*) AS project_connector
      FROM specifications_data_connector d
      LEFT JOIN specifications_source_connector s ON s.id = d.specifications_source_connector_id
      LEFT JOIN specifications_project_connector p ON p.id = d.specifications_project_connector_id
    `;
  }

  static async findBySpecificationId(specificationId) {
    const q = `${SpecificationDataConnector._rowQuery()} WHERE d.specification_id = $1 ORDER BY d.id DESC LIMIT 1`;
    const res = await pool.query(q, [specificationId]);
    return res.rows[0] || null;
  }

  static async findById(id) {
    const q = `${SpecificationDataConnector._rowQuery()} WHERE d.id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    return res.rows[0] || null;
  }

  static async listBySpecificationId(specificationId) {
    const q = `${SpecificationDataConnector._rowQuery()} WHERE d.specification_id = $1 ORDER BY d.id ASC`;
    const res = await pool.query(q, [specificationId]);
    return res.rows || [];
  }

  static async create(specificationId, fields = {}) {
    const q = `
      INSERT INTO specifications_data_connector (
        specification_id,
        specifications_source_connector_id,
        specifications_project_connector_id,
        oid,
        oid_name
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;
    const values = [
      specificationId,
      fields.specifications_source_connector_id ?? null,
      fields.specifications_project_connector_id ?? null,
      fields.oid ?? null,
      fields.oid_name ?? null,
    ];
    const res = await pool.query(q, values);
    if (!res.rows[0] || !res.rows[0].id) return null;
    return await SpecificationDataConnector.findById(res.rows[0].id);
  }

  static async createOrUpdate(specificationId, fields = {}) {
    return await SpecificationDataConnector.create(specificationId, fields);
  }

  static async updateBySpecificationId(specificationId, fields = {}) {
    const allowed = [
      'specifications_source_connector_id',
      'specifications_project_connector_id',
      'oid',
      'oid_name',
    ];
    const sets = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(fields, key)) {
        sets.push(`${key} = $${idx++}`);
        values.push(fields[key]);
      }
    }

    if (sets.length === 0) {
      return await SpecificationDataConnector.findBySpecificationId(specificationId);
    }

    sets.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(specificationId);

    const q = `
      UPDATE specifications_data_connector
      SET ${sets.join(', ')}
      WHERE id = (
        SELECT id
        FROM specifications_data_connector
        WHERE specification_id = $${idx}
        ORDER BY id DESC
        LIMIT 1
      )
      RETURNING id
    `;
    const res = await pool.query(q, values);
    if (!res.rows[0] || !res.rows[0].id) return null;
    return await SpecificationDataConnector.findById(res.rows[0].id);
  }

  static async deleteBySpecificationId(specificationId) {
    const res = await pool.query(
      `DELETE FROM specifications_data_connector
       WHERE id = (
         SELECT id
         FROM specifications_data_connector
         WHERE specification_id = $1
         ORDER BY id DESC
         LIMIT 1
       )
       RETURNING id`,
      [specificationId]
    );
    return res.rowCount > 0;
  }

  static async deleteByIdAndSpecificationId(specificationId, id) {
    const res = await pool.query(
      `DELETE FROM specifications_data_connector
       WHERE id = $2
         AND specification_id = $1
       RETURNING id`,
      [specificationId, id]
    );
    return res.rowCount > 0;
  }
}

module.exports = SpecificationDataConnector;
