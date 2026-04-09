const pool = require('../connection');

class EnvironmentSetting {
  static async list(keys = null) {
    if (Array.isArray(keys) && keys.length > 0) {
      const res = await pool.query(
        `
          SELECT key, value, value_type, description, is_secret, requires_restart, created_at, updated_at
          FROM public.environment_settings
          WHERE key = ANY($1::text[])
          ORDER BY key
        `,
        [keys]
      );
      return res.rows;
    }

    const res = await pool.query(`
      SELECT key, value, value_type, description, is_secret, requires_restart, created_at, updated_at
      FROM public.environment_settings
      ORDER BY key
    `);
    return res.rows;
  }

  static async findByKey(key) {
    if (!key) return null;
    const res = await pool.query(
      `
        SELECT key, value, value_type, description, is_secret, requires_restart, created_at, updated_at
        FROM public.environment_settings
        WHERE key = $1
        LIMIT 1
      `,
      [String(key)]
    );
    return res.rows[0] || null;
  }

  static async upsert(setting) {
    const res = await pool.query(
      `
        INSERT INTO public.environment_settings (key, value, value_type, description, is_secret, requires_restart)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (key) DO UPDATE
        SET
          value = EXCLUDED.value,
          value_type = EXCLUDED.value_type,
          description = EXCLUDED.description,
          is_secret = EXCLUDED.is_secret,
          requires_restart = EXCLUDED.requires_restart,
          updated_at = CURRENT_TIMESTAMP
        RETURNING key, value, value_type, description, is_secret, requires_restart, created_at, updated_at
      `,
      [
        setting.key,
        setting.value,
        setting.value_type,
        setting.description || null,
        !!setting.is_secret,
        !!setting.requires_restart
      ]
    );
    return res.rows[0] || null;
  }

  static async upsertMany(settings = []) {
    if (!Array.isArray(settings) || settings.length === 0) return [];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const rows = [];
      for (const setting of settings) {
        const res = await client.query(
          `
            INSERT INTO public.environment_settings (key, value, value_type, description, is_secret, requires_restart)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (key) DO UPDATE
            SET
              value = EXCLUDED.value,
              value_type = EXCLUDED.value_type,
              description = EXCLUDED.description,
              is_secret = EXCLUDED.is_secret,
              requires_restart = EXCLUDED.requires_restart,
              updated_at = CURRENT_TIMESTAMP
            RETURNING key, value, value_type, description, is_secret, requires_restart, created_at, updated_at
          `,
          [
            setting.key,
            setting.value,
            setting.value_type,
            setting.description || null,
            !!setting.is_secret,
            !!setting.requires_restart
          ]
        );
        rows.push(res.rows[0]);
      }
      await client.query('COMMIT');
      return rows;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = EnvironmentSetting;