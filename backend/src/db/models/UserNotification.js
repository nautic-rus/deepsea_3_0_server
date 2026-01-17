/**
 * Модель для записей центра уведомлений (user_notifications)
 * Содержит уведомления, которые видит пользователь в UI и может пометить как прочитанные/скрыть
 */

const pool = require('../connection');

class UserNotification {
  /**
   * Создать запись уведомления
   * data: { user_id, event_code, project_id, data (object/json) }
   */
  static async create(data) {
    const { user_id, event_code = null, project_id = null, data: payload = null } = data;
    const query = `
      INSERT INTO public.user_notifications (user_id, event_code, project_id, data)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const res = await pool.query(query, [user_id, event_code, project_id, payload ? JSON.stringify(payload) : null]);
    return res.rows[0];
  }

  /**
   * Найти по id
   */
  static async findById(id) {
    const query = `SELECT * FROM public.user_notifications WHERE id = $1`;
    const res = await pool.query(query, [id]);
    return res.rows[0] || null;
  }

  /**
   * Список уведомлений для пользователя, с пагинацией
   * options: { limit=50, offset=0, includeHidden=false }
   */
  static async listForUser(userId, options = {}) {
    const limit = Number(options.limit) || 50;
    const offset = Number(options.offset) || 0;
    const includeHidden = !!options.includeHidden;

    const params = [userId, limit, offset];
    let query = `SELECT * FROM public.user_notifications WHERE user_id = $1`;
    if (!includeHidden) {
      query += ` AND is_hidden = false`;
    }
    query += ` ORDER BY created_at DESC LIMIT $2 OFFSET $3`;

    const res = await pool.query(query, params);
    return res.rows;
  }

  /**
   * Пометить уведомление как прочитанное (и установить read_at)
   */
  static async markAsRead(id, userId) {
    const query = `UPDATE public.user_notifications SET is_read = true, read_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 RETURNING *`;
    const res = await pool.query(query, [id, userId]);
    return res.rows[0] || null;
  }

  /**
   * Пометить уведомление как скрытое (is_hidden=true)
   */
  static async markAsHidden(id, userId) {
    const query = `UPDATE public.user_notifications SET is_hidden = true WHERE id = $1 AND user_id = $2 RETURNING *`;
    const res = await pool.query(query, [id, userId]);
    return res.rows[0] || null;
  }

  /**
   * Посчитать непрочитанные уведомления пользователя
   */
  static async countUnread(userId) {
    const query = `SELECT COUNT(*)::int AS cnt FROM public.user_notifications WHERE user_id = $1 AND is_read = false AND is_hidden = false`;
    const res = await pool.query(query, [userId]);
    return res.rows[0] ? res.rows[0].cnt : 0;
  }
}

module.exports = UserNotification;
