/**
 * Model for user notification settings
 */

const pool = require('../connection');

class UserNotificationSetting {
  /**
   * Create a setting
   */
  static async create(data) {
    const { user_id, project_id = null, specialization_id = null, event_id, method_id, enabled = true, config = null } = data;
    const query = `
      INSERT INTO public.user_notification_settings (user_id, project_id, specialization_id, event_id, method_id, enabled, config)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const res = await pool.query(query, [user_id, project_id, specialization_id, event_id, method_id, enabled, config]);
    return res.rows[0];
  }

  /**
   * Find a setting by its composite key
   */
  static async find(user_id, project_id, specialization_id, event_id, method_id) {
    const query = `
      SELECT *
      FROM public.user_notification_settings
      WHERE user_id = $1
        AND project_id IS NOT DISTINCT FROM $2
        AND specialization_id IS NOT DISTINCT FROM $3
        AND event_id = $4
        AND method_id = $5
    `;
    const res = await pool.query(query, [user_id, project_id, specialization_id, event_id, method_id]);
    return res.rows[0] || null;
  }

  /**
   * Update by id or by composite key
   */
  static async updateByComposite(user_id, project_id, specialization_id, event_id, method_id, fields) {
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
    if (sets.length === 0) return await UserNotificationSetting.find(user_id, project_id, specialization_id, event_id, method_id);
    params.push(user_id, project_id, specialization_id, event_id, method_id);
    const query = `
      UPDATE public.user_notification_settings
      SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $${idx}
        AND project_id IS NOT DISTINCT FROM $${idx+1}
        AND specialization_id IS NOT DISTINCT FROM $${idx+2}
        AND event_id = $${idx+3}
        AND method_id = $${idx+4}
      RETURNING *
    `;
    const res = await pool.query(query, params);
    return res.rows[0] || null;
  }

  static async delete(user_id, project_id, specialization_id, event_id, method_id) {
    const query = `
      DELETE FROM public.user_notification_settings
      WHERE user_id = $1
        AND project_id IS NOT DISTINCT FROM $2
        AND specialization_id IS NOT DISTINCT FROM $3
        AND event_id = $4
        AND method_id = $5
    `;
    await pool.query(query, [user_id, project_id, specialization_id, event_id, method_id]);
    return true;
  }

  static async findByUser(user_id, specialization_id = null) {
    const query = `
      SELECT *
      FROM public.user_notification_settings
      WHERE user_id = $1
        AND specialization_id IS NOT DISTINCT FROM $2
      ORDER BY project_id NULLS FIRST, specialization_id NULLS FIRST, event_id
    `;
    const res = await pool.query(query, [user_id, specialization_id]);
    return res.rows;
  }

  static async findByUserProject(user_id, project_id, specialization_id = null) {
    const query = `
      SELECT *
      FROM public.user_notification_settings
      WHERE user_id = $1
        AND project_id IS NOT DISTINCT FROM $2
        AND specialization_id IS NOT DISTINCT FROM $3
      ORDER BY event_id
    `;
    const res = await pool.query(query, [user_id, project_id, specialization_id]);
    return res.rows;
  }

  /**
   * Get notification recipients for a given event code and project.
   * Returns rows with: user_id, method_code, rc_username, rc_user_id, email
   */
  static async getRecipientsForEvent(project_id, event_code, opts = {}) {
    // Special-case: project_invite notifications must be delivered
    // regardless of user's settings. Caller may provide `opts.target_user_id`.
    if (event_code === 'project_invite') {
      const targetUserId = opts.target_user_id || opts.user_id || null;
      if (!targetUserId) {
        // no target specified — fallback to original behavior (no results)
        return [];
      }
      // Return one row per enabled notification method for the target user,
      // ignoring entries in user_notification_settings.
      const q = `
        SELECT $1::bigint AS user_id, nm.code AS method_code, urc.rc_username, urc.rc_user_id, u.email
        FROM public.notification_methods nm
        LEFT JOIN public.user_rocket_chat urc ON urc.user_id = $1::bigint
        LEFT JOIN public.users u ON u.id = $1::bigint
        WHERE nm.status = true
      `;
      const res = await pool.query(q, [targetUserId]);
      return res.rows;
    }

    const applySpecializationFilter = opts.apply_specialization_filter === true;
    const specializationId = opts.specialization_id === undefined || opts.specialization_id === null
      ? null
      : Number(opts.specialization_id);

    const q = `
      WITH ranked_settings AS (
        SELECT DISTINCT ON (uns.user_id, nm.code)
          uns.user_id,
          uns.enabled,
          nm.code AS method_code,
          urc.rc_username,
          urc.rc_user_id,
          u.email,
          u.is_active
        FROM public.user_notification_settings uns
        JOIN public.notification_events ne ON ne.id = uns.event_id
        JOIN public.notification_methods nm ON nm.id = uns.method_id
        LEFT JOIN public.user_rocket_chat urc ON urc.user_id = uns.user_id
        LEFT JOIN public.users u ON u.id = uns.user_id
        WHERE ne.code = $2
          AND ne.status = true
          AND nm.status = true
          AND (uns.project_id IS NULL OR uns.project_id IS NOT DISTINCT FROM $1)
          AND (
            ($4::boolean = false AND uns.specialization_id IS NULL)
            OR (
              $4::boolean = true
              AND (
                uns.specialization_id IS NULL
                OR ($3::int IS NOT NULL AND uns.specialization_id = $3)
              )
            )
          )
        ORDER BY
          uns.user_id,
          nm.code,
          CASE WHEN uns.project_id IS NOT DISTINCT FROM $1 THEN 1 ELSE 0 END DESC,
          CASE WHEN $4::boolean = true AND $3::int IS NOT NULL AND uns.specialization_id = $3 THEN 1 ELSE 0 END DESC,
          uns.updated_at DESC NULLS LAST,
          uns.id DESC
      )
      SELECT user_id, method_code, rc_username, rc_user_id, email, is_active
      FROM ranked_settings
      WHERE enabled = true
    `;
    const res = await pool.query(q, [
      project_id,
      event_code,
      Number.isNaN(specializationId) ? null : specializationId,
      applySpecializationFilter
    ]);
    return res.rows || [];
  }

}

module.exports = UserNotificationSetting;
