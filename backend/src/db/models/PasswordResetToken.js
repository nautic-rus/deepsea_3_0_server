const pool = require('../connection');

class PasswordResetToken {
  static async create({ user_id, token, expires_at }) {
    const q = `INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1,$2,$3) RETURNING id, user_id, token, expires_at, used, created_at`;
    const vals = [user_id, token, expires_at];
    const res = await pool.query(q, vals);
    return res.rows[0];
  }

  static async findValidByToken(token) {
    const q = `SELECT id, user_id, token, expires_at, used, created_at FROM password_reset_tokens WHERE token = $1 AND used = false AND expires_at > NOW() LIMIT 1`;
    const res = await pool.query(q, [token]);
    return res.rows[0] || null;
  }

  static async markUsed(id) {
    const q = `UPDATE password_reset_tokens SET used = true WHERE id = $1 RETURNING id`;
    const res = await pool.query(q, [id]);
    return res.rowCount > 0;
  }
}

module.exports = PasswordResetToken;
