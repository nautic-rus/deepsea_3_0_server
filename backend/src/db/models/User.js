/**
 * Модель пользователя
 */

const pool = require('../connection');
const Session = require('./Session');
const AuditLog = require('./AuditLog');

class User {
  /**
   * Найти пользователя по username
   */
  static async findByUsername(username) {
    const query = `
      SELECT 
        id, 
        username, 
        email, 
        phone,
        password_hash, 
        first_name, 
        last_name, 
        middle_name,
          department_id,
          group_id,
          organization_id,
          job_title_id,
        is_active, 
        is_verified,
        last_login,
        created_at,
        updated_at
      FROM users 
      WHERE username = $1
    `;
    
    const result = await pool.query(query, [username]);
    return result.rows[0] || null;
  }

  /**
   * Найти пользователя по ID
   */
  static async findById(id) {
    const query = `
      SELECT 
        u.id, 
        u.username, 
        u.email, 
        u.phone,
        u.first_name, 
        u.avatar_id,
        u.last_name, 
        u.middle_name,
        u.department_id,
        d.name AS department,
        u.group_id,
        g.name AS group_name,
        u.organization_id,
        o.name AS organization_name,
        u.job_title_id,
        jt.name AS job_title,
        u.is_active, 
        u.is_verified,
        u.last_login,
        u.created_at,
        u.updated_at
      FROM users u
      LEFT JOIN department d ON u.department_id = d.id
      LEFT JOIN job_title jt ON u.job_title_id = jt.id
      LEFT JOIN groups g ON u.group_id = g.id
      LEFT JOIN organizations o ON u.organization_id = o.id
      WHERE u.id = $1
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Set avatar URL for a user and return updated user record
   */
  static async setAvatar(id, url) {
    const query = `UPDATE users SET avatar_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id`;
    const res = await pool.query(query, [url || null, id]);
    if (res.rowCount === 0) return null;
    return await User.findById(id);
  }

  /**
   * Set password hash for a user
   */
  static async setPassword(id, password_hash, actor_id = null) {
    const query = `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id`;
    const res = await pool.query(query, [password_hash, id]);
    if (res.rowCount === 0) return null;
    // Deactivate all existing sessions for the user after password change
    try {
      await Session.deactivateAllUserSessions(id);
    } catch (e) {
      // Log but don't fail the password update if session invalidation fails
      console.error('Failed to deactivate user sessions after password change', e && e.message ? e.message : e);
    }
    // Audit log: record who initiated the password change
    try {
      await AuditLog.create({
        actor_id: actor_id || null,
        entity: 'user',
        entity_id: id,
        action: 'password.change',
        details: { initiated_by: actor_id || null }
      });
    } catch (e) {
      console.error('Failed to write audit log for password change', e && e.message ? e.message : e);
    }

    return await User.findById(id);
  }

  /**
   * Обновить время последнего входа
   */
  static async updateLastLogin(userId) {
    const query = `
      UPDATE users 
      SET last_login = CURRENT_TIMESTAMP 
      WHERE id = $1
    `;
    
    await pool.query(query, [userId]);
  }

  /**
   * Найти пользователя по email
   */
  static async findByEmail(email) {
    const query = `
      SELECT 
        id, 
        username, 
        email, 
        phone,
        password_hash, 
        first_name, 
        last_name, 
        middle_name,
          department_id,
          group_id,
          organization_id,
          job_title_id,
        is_active, 
        is_verified,
        last_login,
        created_at,
        updated_at
      FROM users 
      WHERE email = $1
    `;
    
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  }

  /**
   * Найти пользователя по phone
   */
  static async findByPhone(phone) {
    const query = `
      SELECT 
        id, 
        username, 
        email, 
        phone,
        password_hash, 
        first_name, 
        last_name, 
        middle_name,
          department_id,
          group_id,
          organization_id,
          job_title_id,
        is_active, 
        is_verified,
        last_login,
        created_at,
        updated_at
      FROM users 
      WHERE phone = $1
    `;
    
    const result = await pool.query(query, [phone]);
    return result.rows[0] || null;
  }

  /**
   * Создать нового пользователя
   */
  static async create(userData) {
    const {
      username,
      email,
      phone,
      password_hash,
      first_name,
      last_name,
      middle_name,
      department_id,
      group_id,
      organization_id,
      job_title_id,
      is_active = true,
      is_verified = false
    } = userData;

    const query = `
      INSERT INTO users (
        username, 
        email, 
        phone, 
        password_hash, 
        first_name, 
        last_name, 
        middle_name,
        department_id,
        group_id,
        organization_id,
        job_title_id,
        is_active, 
        is_verified
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING 
        id, 
        username, 
        email, 
        phone,
        first_name, 
        last_name, 
        middle_name,
        department_id,
        group_id,
        organization_id,
        job_title_id,
        is_active, 
        is_verified,
        created_at,
        updated_at
    `;
    
    const result = await pool.query(query, [
      username,
      email,
      phone,
      password_hash,
      first_name || null,
      last_name || null,
      middle_name || null,
      department_id || null,
      group_id || null,
      organization_id || null,
      job_title_id || null,
      is_active,
      is_verified
    ]);
    
    return result.rows[0];
  }

  /**
   * Обновить существующего пользователя (частично). Возвращает обновлённую запись.
   */
  static async update(id, fields) {
    const allowed = ['username','email','phone','first_name','last_name','middle_name','department_id','group_id','organization_id','job_title_id','is_active','is_verified'];
    const sets = [];
    const params = [];
    let idx = 1;
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(fields, key)) {
        sets.push(`${key} = $${idx}`);
        params.push(fields[key]);
        idx++;
      }
    }
    if (sets.length === 0) return await User.findById(id);
  params.push(id);
  const query = `UPDATE users SET ${sets.join(', ')} , updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING id`;
  const res = await pool.query(query, params);
  if (res.rowCount === 0) return null;
  // Return full record with joined department and job_title names
  return await User.findById(id);
  }

  /**
   * Soft-delete user (set is_active = false)
   */
  static async softDelete(id) {
    const query = `UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id`;
    const res = await pool.query(query, [id]);
    return res.rowCount > 0;
  }

  /**
   * Посчитать пользователей с опциональным поиском
   */
  static async countUsers(search, is_active) {
    const params = [];
    const whereParts = [];
    if (search) {
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      whereParts.push(`(username ILIKE $${params.length - 2} OR email ILIKE $${params.length - 1} OR phone ILIKE $${params.length})`);
    }
    if (typeof is_active === 'boolean') {
      params.push(is_active);
      whereParts.push(`is_active = $${params.length}`);
    }
    const where = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';
    const query = `SELECT COUNT(*) AS total FROM users ${where}`;
    const res = await pool.query(query, params);
    return parseInt(res.rows[0].total, 10) || 0;
  }

  /**
   * Вернуть список пользователей с пагинацией и поиском
   */
  static async listUsers({ search = null, limit, offset = 0, is_active } = {}) {
    const params = [];
    const whereParts = [];
    // Build WHERE clauses with dynamic parameter positions
    if (search) {
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      whereParts.push(`(u.username ILIKE $${params.length - 2} OR u.email ILIKE $${params.length - 1} OR u.phone ILIKE $${params.length})`);
    }
    if (typeof is_active === 'boolean') {
      params.push(is_active);
      whereParts.push(`u.is_active = $${params.length}`);
    }

    const where = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

    // Note: join department and job_title to return textual names
    let paging = '';
    if (limit != null) {
      params.push(limit, offset);
      const limitParamIndex = params.length - 1;
      const offsetParamIndex = params.length;
      paging = `LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}`;
    } else if (offset) {
      params.push(offset);
      paging = `OFFSET $${params.length}`;
    }

    const query = `
      SELECT u.id,
             u.username,
              u.avatar_id,
             u.email,
             u.phone,
             u.first_name,
             u.last_name, 
             u.middle_name,
            u.department_id,
             d.name AS department,
             u.group_id,
             g.name AS group_name,
             u.organization_id,
             o.name AS organization_name,
             u.job_title_id,
             jt.name AS job_title,
             u.is_active,
             u.is_verified,
             u.created_at,
             u.updated_at
      FROM users u
      LEFT JOIN department d ON u.department_id = d.id
      LEFT JOIN job_title jt ON u.job_title_id = jt.id
      LEFT JOIN groups g ON u.group_id = g.id
      LEFT JOIN organizations o ON u.organization_id = o.id
      ${where}
      ORDER BY u.id ASC
      ${paging}
    `;
    const res = await pool.query(query, params);
    return res.rows;
  }
}

module.exports = User;

