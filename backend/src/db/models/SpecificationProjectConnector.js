const pool = require('../connection');

class SpecificationProjectConnector {
  static async listAll() {
    const q = `
      SELECT id, created_at, project_code, source
      FROM specifications_project_connector
      ORDER BY id ASC
    `;
    const res = await pool.query(q);
    return res.rows || [];
  }

  static async findById(id) {
    const q = `
      SELECT id, created_at, project_code, source
      FROM specifications_project_connector
      WHERE id = $1
      LIMIT 1
    `;
    const res = await pool.query(q, [id]);
    return res.rows[0] || null;
  }

  static async create(fields = {}) {
    const q = `
      INSERT INTO specifications_project_connector (project_code, source)
      VALUES ($1, $2)
      ON CONFLICT (project_code) DO UPDATE
      SET source = COALESCE(EXCLUDED.source, specifications_project_connector.source)
      RETURNING id, created_at, project_code, source
    `;
    const values = [
      fields.project_code ?? null,
      fields.source ?? null,
    ];
    const res = await pool.query(q, values);
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

  static async updateById(id, fields = {}) {
    const current = await SpecificationProjectConnector.findById(id);
    if (!current) return null;

    const payload = {};
    if (Object.prototype.hasOwnProperty.call(fields, 'project_code')) payload.project_code = fields.project_code;
    if (Object.prototype.hasOwnProperty.call(fields, 'source')) payload.source = fields.source;

    return await SpecificationProjectConnector._updateProjectConnector(id, payload);
  }

  static async deleteById(id) {
    const del = await pool.query(
      `DELETE FROM specifications_project_connector WHERE id = $1`,
      [id]
    );
    return del.rowCount > 0;
  }
}

module.exports = SpecificationProjectConnector;
