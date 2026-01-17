/**
 * Model for user notification settings
 */

const pool = require('../connection');

class UserNotificationSetting {
  /**
   * Create a setting
   */
  static async create(data) {
    const { user_id, project_id = null, event_id, method_id, enabled = true, config = null } = data;
    const query = `
      INSERT INTO public.user_notification_settings (user_id, project_id, event_id, method_id, enabled, config)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const res = await pool.query(query, [user_id, project_id, event_id, method_id, enabled, config]);
    return res.rows[0];
  }

  /**
   * Find a setting by its composite key
   */
  static async find(user_id, project_id, event_id, method_id) {
    const query = `SELECT * FROM public.user_notification_settings WHERE user_id = $1 AND project_id IS NOT DISTINCT FROM $2 AND event_id = $3 AND method_id = $4`;
    const res = await pool.query(query, [user_id, project_id, event_id, method_id]);
    return res.rows[0] || null;
  }

  /**
   * Update by id or by composite key
   */
  static async updateById(id, fields) {
    const allowed = ['enabled', 'config'];
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
    if (sets.length === 0) return await UserNotificationSetting.findById(id);
    params.push(id);
    const query = `UPDATE public.user_notification_settings SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING *`;
    const res = await pool.query(query, params);
    return res.rows[0] || null;
  }

  static async updateByComposite(user_id, project_id, event_id, method_id, fields) {
    const allowed = ['enabled', 'config'];
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
    if (sets.length === 0) return await UserNotificationSetting.find(user_id, project_id, event_id, method_id);
    params.push(user_id, project_id, event_id, method_id);
    const query = `UPDATE public.user_notification_settings SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE user_id = $${idx} AND project_id IS NOT DISTINCT FROM $${idx+1} AND event_id = $${idx+2} AND method_id = $${idx+3} RETURNING *`;
    const res = await pool.query(query, params);
    return res.rows[0] || null;
  }

  static async delete(user_id, project_id, event_id, method_id) {
    const query = `DELETE FROM public.user_notification_settings WHERE user_id = $1 AND project_id IS NOT DISTINCT FROM $2 AND event_id = $3 AND method_id = $4`;
    await pool.query(query, [user_id, project_id, event_id, method_id]);
    return true;
  }

  static async findByUser(user_id) {
    const query = `SELECT * FROM public.user_notification_settings WHERE user_id = $1 ORDER BY project_id NULLS FIRST, event_id`;
    const res = await pool.query(query, [user_id]);
    return res.rows;
  }

  static async findByUserProject(user_id, project_id) {
    const query = `SELECT * FROM public.user_notification_settings WHERE user_id = $1 AND project_id IS NOT DISTINCT FROM $2 ORDER BY event_id`;
    const res = await pool.query(query, [user_id, project_id]);
    return res.rows;
  }

  /**
   * Get notification recipients for a given event code and project.
   * Returns rows with: user_id, method_code, rc_username, rc_user_id, email
   */
  static async getRecipientsForEvent(project_id, event_code) {
    const q = `
      SELECT uns.user_id, nm.code AS method_code, urc.rc_username, urc.rc_user_id, u.email
      FROM public.user_notification_settings uns
      JOIN public.notification_methods nm ON nm.id = uns.method_id
      LEFT JOIN public.user_rocket_chat urc ON urc.user_id = uns.user_id
      LEFT JOIN public.users u ON u.id = uns.user_id
      WHERE uns.enabled = true
        AND uns.event_id = (SELECT id FROM public.notification_events WHERE code = $2 LIMIT 1)
        AND (uns.project_id IS NULL OR uns.project_id = $1)
    `;
    const res = await pool.query(q, [project_id, event_code]);
    return res.rows;
  }

  static async findById(id) {
    const query = `SELECT * FROM public.user_notification_settings WHERE id = $1`;
    const res = await pool.query(query, [id]);
    return res.rows[0] || null;
  }
}

module.exports = UserNotificationSetting;
