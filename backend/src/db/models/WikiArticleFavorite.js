const pool = require('../connection');

class WikiArticleFavorite {
  static async list(filters = {}) {
    const { id, user_id, article_id, page = 1, limit } = filters;
    const offset = limit ? (page - 1) * limit : 0;
    const where = [];
    const values = [];
    let idx = 1;
    if (id !== undefined) { where.push(`waf.id = $${idx++}`); values.push(id); }
    if (user_id !== undefined) { where.push(`waf.user_id = $${idx++}`); values.push(user_id); }
    if (article_id !== undefined) { where.push(`waf.article_id = $${idx++}`); values.push(article_id); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    let q = `SELECT waf.id, waf.user_id, waf.article_id, waf.created_at, wa.title, wa.summary
      FROM wiki_articles_favorites waf
      JOIN wiki_articles wa ON wa.id = waf.article_id
      ${whereSql} ORDER BY waf.created_at DESC`;

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
    const q = `SELECT id, user_id, article_id, created_at FROM wiki_articles_favorites WHERE id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    return res.rows[0] || null;
  }

  static async findByUserAndArticle(user_id, article_id) {
    const q = `SELECT id, user_id, article_id, created_at FROM wiki_articles_favorites WHERE user_id = $1 AND article_id = $2 LIMIT 1`;
    const res = await pool.query(q, [user_id, article_id]);
    return res.rows[0] || null;
  }

  static async create(fields) {
    const q = `INSERT INTO wiki_articles_favorites (user_id, article_id) VALUES ($1,$2) RETURNING id, user_id, article_id, created_at`;
    const vals = [fields.user_id, fields.article_id];
    const res = await pool.query(q, vals);
    return res.rows[0];
  }

  static async deleteByUserAndArticle(user_id, article_id) {
    const q = `DELETE FROM wiki_articles_favorites WHERE user_id = $1 AND article_id = $2`;
    const res = await pool.query(q, [user_id, article_id]);
    return res.rowCount > 0;
  }

  static async delete(id) {
    const q = `DELETE FROM wiki_articles_favorites WHERE id = $1`;
    const res = await pool.query(q, [id]);
    return res.rowCount > 0;
  }
}

module.exports = WikiArticleFavorite;
