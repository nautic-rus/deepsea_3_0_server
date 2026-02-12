const pool = require('../connection');

const EntityLink = {
  async create({ active_type, active_id, passive_type, passive_id, relation_type = 'relates', created_by = null }) {
    const sql = `
      INSERT INTO entity_links (active_type, active_id, passive_type, passive_id, relation_type, created_by)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *
    `;
    const { rows } = await pool.query(sql, [active_type, active_id, passive_type, passive_id, relation_type, created_by]);
    return rows[0];
  },

  async findById(id) {
    const { rows } = await pool.query('SELECT * FROM entity_links WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async listForActive(active_type, active_id) {
    const { rows } = await pool.query('SELECT * FROM entity_links WHERE active_type = $1 AND active_id = $2 ORDER BY created_at DESC', [active_type, active_id]);
    return rows;
  },

  async listForPassive(passive_type, passive_id) {
    const { rows } = await pool.query('SELECT * FROM entity_links WHERE passive_type = $1 AND passive_id = $2 ORDER BY created_at DESC', [passive_type, passive_id]);
    return rows;
  },

  async remove(id) {
    const { rows } = await pool.query('DELETE FROM entity_links WHERE id = $1 RETURNING *', [id]);
    return rows[0] || null;
  },

  /**
   * Универсальный поиск по таблице entity_links.
   *
  * Поддерживаемые фильтры: id, active_type, active_id, passive_type, passive_id,
  * relation_type, created_by.
   * Если значение фильтра — массив, будет использовано "= ANY($n)" для поиска по множеству значений.
   * Возвращает массив строк, отсортированных по created_at DESC.
   *
   * @param {Object} filters
   * @returns {Promise<Array<Object>>}
   */
  async find(filters = {}) {
  const allowed = ['id', 'active_type', 'active_id', 'passive_type', 'passive_id', 'relation_type', 'created_by'];
    const where = [];
    const params = [];
    let idx = 1;

    for (const key of allowed) {
      if (filters[key] === undefined) continue;
      const val = filters[key];
      if (Array.isArray(val)) {
        where.push(`${key} = ANY($${idx})`);
        params.push(val);
      } else {
        where.push(`${key} = $${idx}`);
        params.push(val);
      }
      idx += 1;
    }

    const sql = `SELECT * FROM entity_links ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC`;
    const { rows } = await pool.query(sql, params);
    return rows;
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
