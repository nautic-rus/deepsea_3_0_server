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
/**
 * FK field → SQL query mapping per entity code.
 * Each query must return a single column `name` for the given id ($1).
 */
const FK_RESOLVERS = {
  issue: {
    status_id: 'SELECT name FROM issue_status WHERE id = $1',
    type_id: 'SELECT name FROM issue_type WHERE id = $1',
    assignee_id: "SELECT TRIM(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')) AS name FROM users WHERE id = $1",
    author_id: "SELECT TRIM(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')) AS name FROM users WHERE id = $1",
    project_id: 'SELECT name FROM projects WHERE id = $1',
  },
  document: {
    status_id: 'SELECT name FROM document_status WHERE id = $1',
    type_id: 'SELECT name FROM document_type WHERE id = $1',
    stage_id: 'SELECT name FROM stages WHERE id = $1',
    specialization_id: 'SELECT name FROM specializations WHERE id = $1',
    directory_id: 'SELECT name FROM document_directories WHERE id = $1',
    assigne_to: "SELECT TRIM(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')) AS name FROM users WHERE id = $1",
    created_by: "SELECT TRIM(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')) AS name FROM users WHERE id = $1",
    updated_by: "SELECT TRIM(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')) AS name FROM users WHERE id = $1",
    project_id: 'SELECT name FROM projects WHERE id = $1',
  },
  customer_question: {
    status_id: 'SELECT name FROM customer_question_status WHERE id = $1',
    type_id: 'SELECT name FROM customer_question_type WHERE id = $1',
    asked_by: "SELECT TRIM(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')) AS name FROM users WHERE id = $1",
    answered_by: "SELECT TRIM(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')) AS name FROM users WHERE id = $1",
    project_id: 'SELECT name FROM projects WHERE id = $1',
  }
};

/**
 * Resolve FK id fields to human-readable names.
 *
 * Enriches content.before / content.after / content.value with `field_name`
 * keys for every known FK field.  E.g. status_id: 3 → status_id_name: "In Progress"
 *
 * @param {string} entityCode - 'issue' | 'document' | 'customer_question'
 * @param {object} content    - the `content` part of notification data
 * @returns {Promise<object>} enriched content (shallow clone; originals untouched)
 */
async function resolveFieldNames(entityCode, content) {
  if (!content || !entityCode) return content;
  const resolvers = FK_RESOLVERS[entityCode];
  if (!resolvers) return content;

  // Collect sources to enrich
  const sources = {};
  if (content.before && typeof content.before === 'object') sources.before = content.before;
  if (content.after && typeof content.after === 'object') sources.after = content.after;
  if (content.value && typeof content.value === 'object' && !Array.isArray(content.value)) sources.value = content.value;
  if (Object.keys(sources).length === 0) return content;

  // Collect all {field, id} pairs that need resolution
  const tasks = []; // { field, id, target, sql }
  for (const [srcName, srcObj] of Object.entries(sources)) {
    for (const [field, sql] of Object.entries(resolvers)) {
      const val = srcObj[field];
      if (val !== undefined && val !== null) {
        tasks.push({ field, id: val, target: srcName, sql });
      }
    }
  }
  if (tasks.length === 0) return content;

  // Resolve with caching (same query+id → same name)
  const cache = new Map();
  const result = Object.assign({}, content);
  // Shallow-clone each source so we don't mutate originals
  for (const key of Object.keys(sources)) {
    result[key] = Object.assign({}, result[key]);
  }

  for (const t of tasks) {
    const cacheKey = `${t.sql}|${t.id}`;
    let name;
    if (cache.has(cacheKey)) {
      name = cache.get(cacheKey);
    } else {
      try {
        const res = await pool.query(t.sql, [t.id]);
        name = (res.rows[0] && res.rows[0].name) ? res.rows[0].name.trim() || null : null;
      } catch (_) {
        name = null;
      }
      cache.set(cacheKey, name);
    }
    if (name !== null) {
      result[t.target][t.field + '_name'] = name;
    }
  }

  return result;
}

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
module.exports.resolveFieldNames = resolveFieldNames;
