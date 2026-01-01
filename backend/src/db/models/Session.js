/**
 * Модель сессии
 */

const pool = require('../connection');

class Session {
  /**
   * Создать новую сессию
   */
  static async create(sessionData) {
    const {
      user_id,
      token,
      refresh_token,
      ip_address,
      user_agent,
      expires_at
    } = sessionData;

    const query = `
      INSERT INTO sessions (
        user_id, 
        token, 
        refresh_token, 
        ip_address, 
        user_agent, 
        expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await pool.query(query, [
      user_id,
      token,
      refresh_token,
      ip_address,
      user_agent,
      expires_at
    ]);

    return result.rows[0];
  }

  /**
   * Найти сессию по токену
   */
  static async findByToken(token) {
    const query = `
      SELECT * FROM sessions 
      WHERE token = $1 AND is_active = true
    `;
    
    const result = await pool.query(query, [token]);
    return result.rows[0] || null;
  }

  /**
   * Найти сессию по refresh токену
   */
  static async findByRefreshToken(refreshToken) {
    const query = `
      SELECT * FROM sessions 
      WHERE refresh_token = $1 AND is_active = true
    `;
    
    const result = await pool.query(query, [refreshToken]);
    return result.rows[0] || null;
  }

  /**
   * Деактивировать сессию
   */
  static async deactivate(token) {
    const query = `
      UPDATE sessions 
      SET is_active = false 
      WHERE token = $1
    `;
    
    await pool.query(query, [token]);
  }

  /**
   * Деактивировать все сессии пользователя
   */
  static async deactivateAllUserSessions(userId) {
    const query = `
      UPDATE sessions 
      SET is_active = false 
      WHERE user_id = $1 AND is_active = true
    `;
    
    await pool.query(query, [userId]);
  }
}

module.exports = Session;




