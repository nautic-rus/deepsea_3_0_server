/**
 * Модель пользователя
 */

const pool = require('../connection');

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
      WHERE u.id = $1
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Set avatar URL for a user and return updated user record
   */
  static async setAvatar(id, avatar_id) {
    const query = `UPDATE users SET avatar_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id`;
    const res = await pool.query(query, [avatar_id || null, id]);
    if (res.rowCount === 0) return null;
    return await User.findById(id);
  }

  /**
   * Set password hash for a user
   */
  static async setPassword(id, password_hash) {
    const query = `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id`;
    const res = await pool.query(query, [password_hash, id]);
    if (res.rowCount === 0) return null;
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
        job_title_id,
        is_active, 
        is_verified
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING 
        id, 
        username, 
        email, 
        phone,
        first_name, 
        last_name, 
        middle_name,
        department_id,
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
    const allowed = ['username','email','phone','first_name','last_name','middle_name','department_id','job_title_id','is_active','is_verified'];
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
  static async countUsers(search) {
    let where = '';
    const params = [];
    if (search) {
      params.push(search, search, search);
      where = `WHERE username ILIKE $1 OR email ILIKE $2 OR phone ILIKE $3`;
    }
    const query = `SELECT COUNT(*) AS total FROM users ${where}`;
    const res = await pool.query(query, params);
    return parseInt(res.rows[0].total, 10) || 0;
  }

  /**
   * Вернуть список пользователей с пагинацией и поиском
   */
  static async listUsers({ search = null, limit = 25, offset = 0 } = {}) {
    const params = [];
    let where = '';
    // Build WHERE clause with dynamic parameter positions
    if (search) {
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      where = `WHERE u.username ILIKE $1 OR u.email ILIKE $2 OR u.phone ILIKE $3`;
    }

    // push limit and offset
    params.push(limit, offset);

    // Note: join department and job_title to return textual names
    const limitParamIndex = params.length - 1; // limit is second-last
    const offsetParamIndex = params.length; // offset is last

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
             u.job_title_id,
             jt.name AS job_title,
             u.is_active,
             u.is_verified,
             u.created_at,
             u.updated_at
      FROM users u
      LEFT JOIN department d ON u.department_id = d.id
      LEFT JOIN job_title jt ON u.job_title_id = jt.id
      ${where}
      ORDER BY u.id ASC
      LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
    `;
    const res = await pool.query(query, params);
    return res.rows;
  }
}

module.exports = User;

