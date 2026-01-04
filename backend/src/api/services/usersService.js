/**
 * UsersService
 *
 * Service responsible for user management (create, read, update, delete).
 * Performs permission checks and delegates DB operations to the User model.
 */

const User = require('../../db/models/User');
const pool = require('../../db/connection');
const { hashPassword } = require('../../utils/password');
const { hasPermission } = require('./permissionChecker');

class UsersService {
  /**
   * Создать нового пользователя
   */
  static async createUser(userData, actor) {
    const {
      username,
      email,
      phone,
      password,
      first_name,
      last_name,
      middle_name,
      department_id,
      job_title_id,
      is_active,
      is_verified
    } = userData;

    // Проверка прав: требуется разрешение 'users.create'
  const requiredPermission = 'users.create';
    // Если нет информации о вызывающем пользователе — нельзя создавать
    if (!actor || !actor.id) {
      const err = new Error('Authentication required');
      err.statusCode = 401;
      throw err;
    }

    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) {
      const err = new Error('Forbidden: missing permission users.create');
      err.statusCode = 403;
      throw err;
    }

    // Проверить уникальность username
    const existingUserByUsername = await User.findByUsername(username);
    if (existingUserByUsername) {
      const error = new Error('Username already exists');
      error.statusCode = 409;
      throw error;
    }

    // Проверить уникальность email
    const existingUserByEmail = await User.findByEmail(email);
    if (existingUserByEmail) {
      const error = new Error('Email already exists');
      error.statusCode = 409;
      throw error;
    }

    // Проверить уникальность phone
    const existingUserByPhone = await User.findByPhone(phone);
    if (existingUserByPhone) {
      const error = new Error('Phone already exists');
      error.statusCode = 409;
      throw error;
    }

    // Хешировать пароль
    const password_hash = await hashPassword(password);

    // Создать пользователя
    const newUser = await User.create({
      username,
      email,
      phone,
      password_hash,
      first_name,
      last_name,
      middle_name,
      department_id,
      job_title_id,
      is_active: is_active !== undefined ? is_active : true,
      is_verified: is_verified !== undefined ? is_verified : false
    });

    // Вернуть данные пользователя без пароля
    return {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      phone: newUser.phone,
      first_name: newUser.first_name,
      last_name: newUser.last_name,
      middle_name: newUser.middle_name,
      department_id: newUser.department_id,
      job_title_id: newUser.job_title_id,
      is_active: newUser.is_active,
      is_verified: newUser.is_verified,
      created_at: newUser.created_at,
      updated_at: newUser.updated_at
    };
  }

  /**
   * Получить одного пользователя по id
   */
  static async getUserById(id, actor) {
    const requiredPermission = 'users.view';

    if (!actor || !actor.id) {
      const err = new Error('Authentication required');
      err.statusCode = 401;
      throw err;
    }

    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) {
      const err = new Error('Forbidden: missing permission users.view');
      err.statusCode = 403;
      throw err;
    }

    if (!id || Number.isNaN(id) || id <= 0) {
      const err = new Error('Invalid user id');
      err.statusCode = 400;
      throw err;
    }

    const user = await User.findById(id);
    if (!user) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      first_name: user.first_name,
      last_name: user.last_name,
      middle_name: user.middle_name,
      department_id: user.department_id,
      department: user.department,
      job_title_id: user.job_title_id,
      job_title: user.job_title,
      is_active: user.is_active,
      is_verified: user.is_verified,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  }

  /**
   * Получить список пользователей с поддержкой пагинации и поиска
   * query: { page, limit, search }
   */
  static async listUsers(query = {}, actor) {
    const requiredPermission = 'users.view';

    // Проверка аутентификации/разрешения
    if (!actor || !actor.id) {
      const err = new Error('Authentication required');
      err.statusCode = 401;
      throw err;
    }

    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) {
      const err = new Error('Forbidden: missing permission users.view');
      err.statusCode = 403;
      throw err;
    }

    // Pagination
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 25, 1), 200);
    const offset = (page - 1) * limit;

    // Search (username/email/phone)
    const search = query.search ? `%${query.search.trim()}%` : null;

    let where = '';
    const params = [];
    if (search) {
      params.push(search, search, search);
      where = `WHERE username ILIKE $${params.length - 2} OR email ILIKE $${params.length - 1} OR phone ILIKE $${params.length}`;
    }

    // Delegate DB work to User model
    const total = await User.countUsers(query.search ? query.search.trim() : null);
    const data = await User.listUsers({ search: query.search ? query.search.trim() : null, limit, offset });

    return {
      data,
      meta: {
        page,
        limit,
        total
      }
    };
  }
}

module.exports = UsersService;

// Update existing user (partial update)
UsersService.updateUser = async function (id, fields, actor) {
  const requiredPermission = 'users.update';
  if (!actor || !actor.id) {
    const err = new Error('Authentication required'); err.statusCode = 401; throw err;
  }
  const allowed = await hasPermission(actor, requiredPermission);
  if (!allowed) { const err = new Error('Forbidden: missing permission users.update'); err.statusCode = 403; throw err; }

  if (!id || Number.isNaN(Number(id)) || Number(id) <= 0) {
    const err = new Error('Invalid user id'); err.statusCode = 400; throw err;
  }

  // Prevent changing password via this endpoint
  if (fields.password || fields.password_hash) {
    const err = new Error('Password cannot be changed via this endpoint'); err.statusCode = 400; throw err;
  }

  // If updating username/email/phone, ensure uniqueness
  if (fields.username) {
    const existing = await User.findByUsername(fields.username);
    if (existing && existing.id !== Number(id)) { const err = new Error('Username already exists'); err.statusCode = 409; throw err; }
  }
  if (fields.email) {
    const existing = await User.findByEmail(fields.email);
    if (existing && existing.id !== Number(id)) { const err = new Error('Email already exists'); err.statusCode = 409; throw err; }
  }
  if (fields.phone) {
    const existing = await User.findByPhone(fields.phone);
    if (existing && existing.id !== Number(id)) { const err = new Error('Phone already exists'); err.statusCode = 409; throw err; }
  }

  const updated = await User.update(Number(id), fields);
  if (!updated) { const err = new Error('User not found'); err.statusCode = 404; throw err; }
  return updated;
};

// Soft-delete user
UsersService.deleteUser = async function (id, actor) {
  const requiredPermission = 'users.delete';
  if (!actor || !actor.id) {
    const err = new Error('Authentication required'); err.statusCode = 401; throw err;
  }
  const allowed = await hasPermission(actor, requiredPermission);
  if (!allowed) { const err = new Error('Forbidden: missing permission users.delete'); err.statusCode = 403; throw err; }

  if (!id || Number.isNaN(Number(id)) || Number(id) <= 0) {
    const err = new Error('Invalid user id'); err.statusCode = 400; throw err;
  }

  const ok = await User.softDelete(Number(id));
  if (!ok) { const err = new Error('User not found'); err.statusCode = 404; throw err; }
  return { success: true };
};


