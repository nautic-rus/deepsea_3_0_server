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
    // Normalize payload into unified format:
    // {
    //   initiator: { id, full_name, avatar_id },
    //   entity: { id, code, title },
    //   content: { before?, after? } OR { value }
    // }
    let sanitized = payload;
    try {
      const buildInitiator = async (p) => {
        if (!p) return { id: null, full_name: null, avatar_id: null };
        if (p.initiator && typeof p.initiator === 'object') {
          return {
            id: p.initiator.id || null,
            full_name: p.initiator.full_name || p.initiator.name || null,
            avatar_id: p.initiator.avatar_id || null
          };
        }
        const initiatorId = p.assigned_by || p.initiator_id || p.actor_id || (p.actor && p.actor.id) || null;
        if (!initiatorId) return { id: null, full_name: null, avatar_id: null };
        try {
          const User = require('./User');
          const u = await User.findById(initiatorId);
          if (u) return { id: u.id, full_name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || null, avatar_id: u.avatar_id || null };
        } catch (e) {
          // ignore lookup errors
        }
        return { id: initiatorId, full_name: null, avatar_id: null };
      };

      const buildEntity = (p) => {
        if (!p || typeof p !== 'object') return { id: null, code: null, title: null };
        const entityKeys = ['issue', 'document', 'question', 'user', 'project', 'entity'];
        for (const key of entityKeys) {
          if (Object.prototype.hasOwnProperty.call(p, key) && p[key]) {
            const e = p[key];
            const id = e.id || e[`${key}_id`] || null;
            const title = e.title || e.name || e.subject || e.number || null;
            return { id, code: key, title };
          }
        }
        // If top-level has id/code/title fields
        if (p.id || p.code || p.title || p.name) {
          return { id: p.id || null, code: p.code || null, title: p.title || p.name || null };
        }
        return { id: null, code: null, title: null };
      };

      const buildContent = (p) => {
        if (!p) return { value: null };
        if (Object.prototype.hasOwnProperty.call(p, 'before') || Object.prototype.hasOwnProperty.call(p, 'after')) {
          return { before: p.before || null, after: p.after || null };
        }
        // if payload contains changed fields map
        if (p.changes && typeof p.changes === 'object') {
          return { before: p.changes.before || null, after: p.changes.after || null };
        }
        // fallback: store provided payload (excluding large nested entities)
        return { value: p.value !== undefined ? p.value : p };
      };

      // If payload already looks normalized, keep as is
      const looksNormalized = sanitized && typeof sanitized === 'object' && (sanitized.initiator || sanitized.entity || sanitized.content);
      if (!looksNormalized) {
        const initiator = await buildInitiator(sanitized || {});
        const entity = buildEntity(sanitized || {});
        const content = buildContent(sanitized || {});
        sanitized = { initiator, entity, content };
      } else {
        // ensure initiator has required subfields (try to fetch if only id present)
        if (sanitized.initiator && typeof sanitized.initiator === 'object' && sanitized.initiator.id && !sanitized.initiator.full_name) {
          try {
            const User = require('./User');
            const u = await User.findById(sanitized.initiator.id);
            if (u) sanitized.initiator.full_name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || null;
            if (u && u.avatar_id) sanitized.initiator.avatar_id = u.avatar_id;
          } catch (e) { /* ignore */ }
        }
        // remove null via field if present
        if (Object.prototype.hasOwnProperty.call(sanitized, 'via') && (sanitized.via === null || typeof sanitized.via === 'undefined')) delete sanitized.via;
      }
    } catch (e) {
      // on any error fall back to original payload
      sanitized = payload;
    }
    const payloadParam = sanitized ? JSON.stringify(sanitized) : null;

    // Check for an existing identical notification to avoid duplicates
    const findQuery = `
      SELECT * FROM public.user_notifications
      WHERE user_id = $1
        AND event_code IS NOT DISTINCT FROM $2
        AND project_id IS NOT DISTINCT FROM $3
        AND (data = $4::jsonb OR (data IS NULL AND $4 IS NULL))
      LIMIT 1
    `;
    const found = await pool.query(findQuery, [user_id, event_code, project_id, payloadParam]);
    if (found.rows && found.rows[0]) return found.rows[0];

    const query = `
      INSERT INTO public.user_notifications (user_id, event_code, project_id, data)
      VALUES ($1, $2, $3, $4::jsonb)
      RETURNING *
    `;
    const res = await pool.query(query, [user_id, event_code, project_id, payloadParam]);
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
