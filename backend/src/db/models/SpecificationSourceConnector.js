const pool = require('../connection');

class SpecificationSourceConnector {
  static async listAll() {
    const q = `
      SELECT id, code, url, name, created_at
      FROM specifications_source_connector
      ORDER BY id ASC
    `;
    const res = await pool.query(q);
    return res.rows || [];
  }
}

module.exports = SpecificationSourceConnector;
