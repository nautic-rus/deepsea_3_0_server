const pool = require('../connection');

class EntityWatcher {
  static _normalizeEntityType(entityType) {
    if (!entityType) return null;
    const normalized = String(entityType).trim().toLowerCase();
    if (normalized === 'qna') return 'customer_question';
    return normalized;
  }

  static async create({ entity_type, entity_id, user_id, created_by = null }) {
    const query = `
      INSERT INTO public.entity_watchers (entity_type, entity_id, user_id, created_by)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (entity_type, entity_id, user_id)
      DO UPDATE SET created_by = EXCLUDED.created_by
      RETURNING *
    `;
    const res = await pool.query(query, [
      EntityWatcher._normalizeEntityType(entity_type),
      Number(entity_id),
      Number(user_id),
      created_by ? Number(created_by) : null
    ]);
    return res.rows[0] || null;
  }

  static async find(entity_type, entity_id, user_id) {
    const query = `
      SELECT *
      FROM public.entity_watchers
      WHERE entity_type = $1 AND entity_id = $2 AND user_id = $3
      LIMIT 1
    `;
    const res = await pool.query(query, [
      EntityWatcher._normalizeEntityType(entity_type),
      Number(entity_id),
      Number(user_id)
    ]);
    return res.rows[0] || null;
  }

  static async listByEntity(entity_type, entity_id) {
    const query = `
      SELECT ew.*, u.username, u.email, u.first_name, u.last_name, u.middle_name, u.avatar_id, u.is_active
      FROM public.entity_watchers ew
      JOIN public.users u ON u.id = ew.user_id
      WHERE ew.entity_type = $1 AND ew.entity_id = $2
      ORDER BY ew.created_at ASC, ew.id ASC
    `;
    const res = await pool.query(query, [
      EntityWatcher._normalizeEntityType(entity_type),
      Number(entity_id)
    ]);
    return res.rows || [];
  }

  static async listUserIdsByEntity(entity_type, entity_id) {
    const query = `
      SELECT user_id
      FROM public.entity_watchers
      WHERE entity_type = $1 AND entity_id = $2
      ORDER BY created_at ASC, id ASC
    `;
    const res = await pool.query(query, [
      EntityWatcher._normalizeEntityType(entity_type),
      Number(entity_id)
    ]);
    return (res.rows || []).map((row) => Number(row.user_id)).filter((id) => !Number.isNaN(id));
  }

  static async remove(entity_type, entity_id, user_id) {
    const query = `
      DELETE FROM public.entity_watchers
      WHERE entity_type = $1 AND entity_id = $2 AND user_id = $3
      RETURNING *
    `;
    const res = await pool.query(query, [
      EntityWatcher._normalizeEntityType(entity_type),
      Number(entity_id),
      Number(user_id)
    ]);
    return res.rows[0] || null;
  }
}

module.exports = EntityWatcher;
