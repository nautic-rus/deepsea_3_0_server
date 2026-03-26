const pool = require('../connection');

class WikiArticleStorage {
  static async list(filters = {}) {
    const { id, article_id, storage_id, page = 1, limit } = filters;
    const offset = limit ? (page - 1) * limit : 0;
    const where = [];
    const values = [];
    let idx = 1;
    if (id !== undefined) { where.push(`id = $${idx++}`); values.push(id); }
    if (article_id !== undefined) { where.push(`article_id = $${idx++}`); values.push(article_id); }
    if (storage_id !== undefined) { where.push(`storage_id = $${idx++}`); values.push(storage_id); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    let q = `SELECT id, article_id, storage_id, created_at FROM wiki_articles_storage ${whereSql} ORDER BY id`;
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
    const q = `SELECT id, article_id, storage_id, created_at FROM wiki_articles_storage WHERE id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    return res.rows[0] || null;
  }

  static async create(fields) {
    const q = `INSERT INTO wiki_articles_storage (article_id, storage_id) VALUES ($1,$2) RETURNING id, article_id, storage_id, created_at`;
    const vals = [fields.article_id, fields.storage_id];
    const res = await pool.query(q, vals);
    return res.rows[0];
  }

  static async delete(id) {
    const q = `DELETE FROM wiki_articles_storage WHERE id = $1`;
    const res = await pool.query(q, [id]);
    return res.rowCount > 0;
  }
}

module.exports = WikiArticleStorage;
