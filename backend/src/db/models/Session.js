/**
 * Модель сессии
 */

const pool = require('../connection');

class Session {
  static _normalizePositiveInteger(value, fallback = null) {
    const numberValue = Number(value);
    if (!Number.isInteger(numberValue) || numberValue < 1) {
      return fallback;
    }
    return numberValue;
  }

  static async _runInTransaction(executor) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await executor(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        // ignore rollback failures
      }
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Создать новую сессию
   */
  static async create(sessionData, executor = pool) {
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

    const result = await executor.query(query, [
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
   * Создать сессию, ограничивая число активных сессий пользователя.
   * Старые активные сессии отключаются до создания новой.
   */
  static async createWithLimit(sessionData, maxActiveSessions) {
    const normalizedLimit = Session._normalizePositiveInteger(maxActiveSessions, 2);
    return Session._runInTransaction(async (client) => {
      const activeSessionsResult = await client.query(
        `
          SELECT id
          FROM sessions
          WHERE user_id = $1 AND is_active = true
          ORDER BY created_at ASC, id ASC
          FOR UPDATE
        `,
        [sessionData.user_id]
      );

      const activeSessions = activeSessionsResult.rows || [];
      const sessionsToDeactivateCount = Math.max(0, activeSessions.length - normalizedLimit + 1);
      if (sessionsToDeactivateCount > 0) {
        const sessionIdsToDeactivate = activeSessions
          .slice(0, sessionsToDeactivateCount)
          .map((row) => row.id);

        await client.query(
          `
            UPDATE sessions
            SET is_active = false
            WHERE id = ANY($1::int[])
          `,
          [sessionIdsToDeactivate]
        );
      }

      return Session.create(sessionData, client);
    });
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
  static async findByRefreshToken(refreshToken, executor = pool, forUpdate = false) {
    const query = `
      SELECT * FROM sessions 
      WHERE refresh_token = $1 AND is_active = true
      ${forUpdate ? 'FOR UPDATE' : ''}
    `;
    
    const result = await executor.query(query, [refreshToken]);
    return result.rows[0] || null;
  }

  /**
   * Деактивировать сессию
   */
  static async deactivate(token, executor = pool) {
    const query = `
      UPDATE sessions 
      SET is_active = false 
      WHERE token = $1
    `;
    
    await executor.query(query, [token]);
  }

  /**
   * Деактивировать все сессии пользователя
   */
  static async deactivateAllUserSessions(userId, executor = pool) {
    const query = `
      UPDATE sessions 
      SET is_active = false 
      WHERE user_id = $1 AND is_active = true
    `;
    
    await executor.query(query, [userId]);
  }
}

module.exports = Session;


