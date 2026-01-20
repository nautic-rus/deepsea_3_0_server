const pool = require('../connection');

const EntityLink = {
  async create({ source_type, source_id, target_type, target_id, relation_type = 'relates', blocks_closure = false, created_by = null }) {
    const sql = `
      INSERT INTO entity_links (source_type, source_id, target_type, target_id, relation_type, blocks_closure, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *
    `;
    const { rows } = await pool.query(sql, [source_type, source_id, target_type, target_id, relation_type, blocks_closure, created_by]);
    return rows[0];
  },

  async findById(id) {
    const { rows } = await pool.query('SELECT * FROM entity_links WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async listForSource(source_type, source_id) {
    const { rows } = await pool.query('SELECT * FROM entity_links WHERE source_type = $1 AND source_id = $2 ORDER BY created_at DESC', [source_type, source_id]);
    return rows;
  },

  async listForTarget(target_type, target_id) {
    const { rows } = await pool.query('SELECT * FROM entity_links WHERE target_type = $1 AND target_id = $2 ORDER BY created_at DESC', [target_type, target_id]);
    return rows;
  },

  async remove(id) {
    const { rows } = await pool.query('DELETE FROM entity_links WHERE id = $1 RETURNING *', [id]);
    return rows[0] || null;
  },

  // Helper: check whether the given issue can be closed (uses DB function can_close_issue)
  async canCloseIssue(issueId) {
    const { rows } = await pool.query('SELECT can_close_issue($1) AS can_close', [issueId]);
    return rows[0] ? rows[0].can_close : true;
  },

  // Helper: check whether the given document can be closed (uses DB function can_close_document)
  async canCloseDocument(documentId) {
    const { rows } = await pool.query('SELECT can_close_document($1) AS can_close', [documentId]);
    return rows[0] ? rows[0].can_close : true;
  }
};

module.exports = EntityLink;
