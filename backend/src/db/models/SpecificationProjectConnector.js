const pool = require('../connection');

class SpecificationProjectConnector {
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
    const q = `${SpecificationProjectConnector._rowQuery()} WHERE d.specification_id = $1 LIMIT 1`;
    const res = await pool.query(q, [specificationId]);
    return res.rows[0] || null;
  }

  static async _updateProjectConnector(id, fields = {}) {
    const allowed = ['project_code', 'source'];
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
      return await pool.query(
        `SELECT id, created_at, project_code, source
         FROM specifications_project_connector
         WHERE id = $1 LIMIT 1`,
        [id]
      ).then((res) => res.rows[0] || null);
    }

    values.push(id);
    const q = `
      UPDATE specifications_project_connector
      SET ${sets.join(', ')}
      WHERE id = $${idx}
      RETURNING id, created_at, project_code, source
    `;
    const res = await pool.query(q, values);
    return res.rows[0] || null;
  }

  static async createOrUpdate(specificationId, fields = {}) {
    const current = await SpecificationProjectConnector.findBySpecificationId(specificationId);
    if (!current || !current.data_connector) return null;

    const currentDataConnector = current.data_connector;
    const existingProjectConnectorId = currentDataConnector.specifications_project_connector_id || null;
    const payload = {
      project_code: fields.project_code ?? null,
      source: fields.source ?? null,
    };

    if (!existingProjectConnectorId) {
      if (payload.project_code === null || String(payload.project_code).trim() === '') return null;
      const insertRes = await pool.query(
        `INSERT INTO specifications_project_connector (project_code, source)
         VALUES ($1, $2)
         RETURNING id, created_at, project_code, source`,
        [payload.project_code, payload.source]
      );
      const projectConnector = insertRes.rows[0] || null;
      if (!projectConnector) return null;

      await pool.query(
        `UPDATE specifications_data_connector
         SET specifications_project_connector_id = $2, updated_at = CURRENT_TIMESTAMP
         WHERE specification_id = $1`,
        [specificationId, projectConnector.id]
      );
      return await SpecificationProjectConnector.findBySpecificationId(specificationId);
    }

    const updated = await SpecificationProjectConnector._updateProjectConnector(existingProjectConnectorId, payload);
    if (!updated) return null;
    return await SpecificationProjectConnector.findBySpecificationId(specificationId);
  }

  static async updateBySpecificationId(specificationId, fields = {}) {
    const current = await SpecificationProjectConnector.findBySpecificationId(specificationId);
    if (!current || !current.data_connector) return null;

    const currentDataConnector = current.data_connector;
    const existingProjectConnectorId = currentDataConnector.specifications_project_connector_id || null;
    if (!existingProjectConnectorId) return null;

    const payload = {};
    if (Object.prototype.hasOwnProperty.call(fields, 'project_code')) payload.project_code = fields.project_code;
    if (Object.prototype.hasOwnProperty.call(fields, 'source')) payload.source = fields.source;

    const updated = await SpecificationProjectConnector._updateProjectConnector(existingProjectConnectorId, payload);
    if (!updated) return null;
    return await SpecificationProjectConnector.findBySpecificationId(specificationId);
  }

  static async deleteBySpecificationId(specificationId) {
    const current = await SpecificationProjectConnector.findBySpecificationId(specificationId);
    if (!current || !current.data_connector) return false;

    const currentDataConnector = current.data_connector;
    const existingProjectConnectorId = currentDataConnector.specifications_project_connector_id || null;
    if (!existingProjectConnectorId) return false;

    await pool.query(
      `UPDATE specifications_data_connector
       SET specifications_project_connector_id = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE specification_id = $1`,
      [specificationId]
    );
    const del = await pool.query(
      `DELETE FROM specifications_project_connector WHERE id = $1`,
      [existingProjectConnectorId]
    );
    return del.rowCount > 0;
  }
}

module.exports = SpecificationProjectConnector;
