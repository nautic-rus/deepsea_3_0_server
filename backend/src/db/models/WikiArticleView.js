const pool = require('../connection');

class WikiArticleView {
  static async create(fields) {
    const q = `INSERT INTO wiki_article_views (user_id, article_id) VALUES ($1,$2) RETURNING id, user_id, article_id, viewed_at`;
    const vals = [fields.user_id, fields.article_id];
    const res = await pool.query(q, vals);
    return res.rows[0];
  }

  static async listRecentByUser(user_id, limit = 10) {
    const q = `SELECT wav.id, wav.user_id, wav.article_id, wav.viewed_at, wa.title, wa.summary
      FROM wiki_article_views wav
      JOIN wiki_articles wa ON wa.id = wav.article_id
      WHERE wav.user_id = $1
      ORDER BY wav.viewed_at DESC
      LIMIT $2`;
    const res = await pool.query(q, [user_id, limit]);
    return res.rows;
  }
}

module.exports = WikiArticleView;
