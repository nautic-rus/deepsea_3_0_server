/**
 * Модель для записей центра уведомлений (user_notifications)
 * Содержит уведомления, которые видит пользователь в UI и может пометить как прочитанные/скрыть
 */

const pool = require('../connection');

/**
 * Build unified notification data payload.
 *
 * @param {object} actor   - { id, first_name, last_name, avatar_id } (req.user)
 * @param {object} entity  - { id, code, title }
 *                            code: 'issue' | 'document' | 'question' | etc.
 * @param {object} content - either { value: <any> }
 *                            or { before: <any>, after: <any> }
 * @returns {object} unified { initiator, entity, content }
 */
function buildNotificationData(actor, entity, content) {
  const initiator = {
    id: (actor && actor.id) || null,
    full_name: actor ? `${actor.first_name || ''} ${actor.last_name || ''}`.trim() || null : null,
    avatar_id: (actor && actor.avatar_id) || null
  };
  const ent = {
    id: (entity && entity.id) || null,
    code: (entity && entity.code) || null,
    title: (entity && entity.title) || null
  };
  let cont = content || { value: null };
  // For before/after content, keep only the fields that actually changed
  if (cont.before && cont.after) {
    const before = cont.before;
    const after = cont.after;
    const diffBefore = {};
    const diffAfter = {};
    for (const key of Object.keys(after)) {
      if (key === 'updated_at' || key === 'created_at') continue;
      const a = before[key];
      const b = after[key];
      if (a !== b && JSON.stringify(a) !== JSON.stringify(b)) {
        diffBefore[key] = a;
        diffAfter[key] = b;
      }
    }
    cont = { before: diffBefore, after: diffAfter };
  }
  return { initiator, entity: ent, content: cont };
}

class UserNotification {
  /**
   * Создать запись уведомления
   * data: { user_id, event_code, project_id, data (object — unified format) }
   */
  static async create(data) {
    const { user_id, event_code = null, project_id = null, data: payload = null } = data;
    const payloadParam = payload ? JSON.stringify(payload) : null;

    const query = `
      INSERT INTO public.user_notifications (user_id, event_code, project_id, data)
      VALUES ($1, $2, $3, $4::jsonb)
      RETURNING *
    `;
    const res = await pool.query(query, [user_id, event_code, project_id, payloadParam]);
    return res.rows[0];
  }

  /**
   * Список уведомлений для пользователя, с пагинацией
   * options: { limit=50, offset=0, includeHidden=false }
   */
  static async listForUser(userId, options = {}) {
    const limit = options.limit != null ? Number(options.limit) : undefined;
    const offset = Number(options.offset) || 0;
    const includeHidden = !!options.includeHidden;

    const params = [userId];
    let query = `SELECT * FROM public.user_notifications WHERE user_id = $1`;
    if (!includeHidden) {
      query += ` AND is_hidden = false`;
    }
    query += ` ORDER BY created_at DESC`;
    if (limit) {
      params.push(limit, offset);
      query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;
    } else if (offset) {
      params.push(offset);
      query += ` OFFSET $${params.length}`;
    }

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
module.exports.buildNotificationData = buildNotificationData;
