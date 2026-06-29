/**
 * Модель authorization code для OIDC.
 */

const pool = require('../connection');

class OidcAuthorizationCode {
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

  static async create(codeData, executor = pool) {
    const {
      code_hash,
      user_id,
      client_id,
      redirect_uri,
      code_challenge,
      code_challenge_method,
      nonce,
      scope,
      issuer,
      auth_time,
      expires_at,
      ip_address,
      user_agent
    } = codeData;

    const result = await executor.query(
      `
        INSERT INTO public.oidc_authorization_codes (
          code_hash,
          user_id,
          client_id,
          redirect_uri,
          code_challenge,
          code_challenge_method,
          nonce,
          scope,
          issuer,
          auth_time,
          expires_at,
          ip_address,
          user_agent
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `,
      [
        code_hash,
        user_id,
        client_id,
        redirect_uri,
        code_challenge,
        code_challenge_method,
        nonce || null,
        scope || 'openid',
        issuer,
        auth_time || new Date(),
        expires_at,
        ip_address || null,
        user_agent || null
      ]
    );

    return result.rows[0] || null;
  }

  static async findByCodeHash(codeHash, executor = pool, forUpdate = false) {
    const result = await executor.query(
      `
        SELECT *
        FROM public.oidc_authorization_codes
        WHERE code_hash = $1
        ${forUpdate ? 'FOR UPDATE' : ''}
        LIMIT 1
      `,
      [codeHash]
    );
    return result.rows[0] || null;
  }

  static async consumeByCodeHash(codeHash, executor = pool) {
    const result = await executor.query(
      `
        UPDATE public.oidc_authorization_codes
        SET consumed_at = CURRENT_TIMESTAMP
        WHERE code_hash = $1
          AND consumed_at IS NULL
        RETURNING *
      `,
      [codeHash]
    );
    return result.rows[0] || null;
  }
}

module.exports = OidcAuthorizationCode;
