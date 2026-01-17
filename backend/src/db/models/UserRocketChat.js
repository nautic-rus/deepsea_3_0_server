/**
 * Модель для связи пользователя приложения с аккаунтом Rocket.Chat
 */

const pool = require('../connection');

class UserRocketChat {
  /**
   * Создать запись соответствия
   */
  static async create(data) {
    const { user_id, rc_username, rc_user_id = null, rc_display_name = null } = data;
    const query = `
      INSERT INTO user_rocket_chat (
        user_id, rc_username, rc_user_id, rc_display_name
      ) VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const res = await pool.query(query, [user_id, rc_username, rc_user_id, rc_display_name]);
    return res.rows[0];
  }

  /**
   * Найти по user_id
   */
  static async findByUserId(userId) {
  const query = `SELECT * FROM public.user_rocket_chat WHERE user_id = $1`;
    const res = await pool.query(query, [userId]);
    return res.rows[0] || null;
  }

  /**
   * Найти по rc_username
   */
  static async findByRcUsername(rcUsername) {
  const query = `SELECT * FROM public.user_rocket_chat WHERE rc_username = $1`;
    const res = await pool.query(query, [rcUsername]);
    return res.rows[0] || null;
  }

  /**
   * Обновить запись по user_id (partial)
   */
  static async updateByUserId(userId, fields) {
    const allowed = ['rc_username', 'rc_user_id', 'rc_display_name'];
    const sets = [];
    const params = [];
    let idx = 1;
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(fields, k)) {
        sets.push(`${k} = $${idx}`);
        params.push(fields[k]);
        idx++;
      }
    }
    if (sets.length === 0) return await UserRocketChat.findByUserId(userId);
    params.push(userId);
  const query = `UPDATE public.user_rocket_chat SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE user_id = $${idx} RETURNING *`;
    const res = await pool.query(query, params);
    return res.rows[0] || null;
  }

  /**
   * Удалить запись
   */
  static async deleteByUserId(userId) {
  const query = `DELETE FROM public.user_rocket_chat WHERE user_id = $1`;
    await pool.query(query, [userId]);
    return true;
  }
}

module.exports = UserRocketChat;
