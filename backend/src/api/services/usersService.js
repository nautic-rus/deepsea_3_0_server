/**
 * UsersService
 *
 * Service responsible for user management (create, read, update, delete).
 * Performs permission checks and delegates DB operations to the User model.
 */

const User = require('../../db/models/User');
const pool = require('../../db/connection');
const { hashPassword } = require('../../utils/password');
const crypto = require('crypto');
const { hasPermission } = require('./permissionChecker');
const NotificationTemplateService = require('./notificationTemplateService');
const EmailService = require('./emailService');

class UsersService {
  /**
   * Создать нового пользователя
   */
  static async createUser(userData, actor) {
    // Allow overriding username/password later if needed
    let {
      username,
      email,
      phone,
      password,
      first_name,
      last_name,
      middle_name,
      department_id,
      group_id,
      organization_id,
      job_title_id,
      is_active,
      is_verified
    } = userData;

    // Helper: generate a strong password with required character classes
    function generateStrongPassword(length = 16) {
      const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const lower = 'abcdefghijklmnopqrstuvwxyz';
      const digits = '0123456789';
      const symbols = '!@#$%^&*()-_=+[]{};:,.<>?';
      const all = upper + lower + digits + symbols;

      // Ensure at least one char from each set
      const rnd = (chars) => chars[Math.floor(crypto.randomBytes(1)[0] / 256 * chars.length)];
      const required = [rnd(upper), rnd(lower), rnd(digits), rnd(symbols)];

      const rest = [];
      for (let i = 0; i < length - required.length; i++) {
        rest.push(rnd(all));
      }

      const passwordArray = required.concat(rest);
      // Shuffle
      for (let i = passwordArray.length - 1; i > 0; i--) {
        const j = Math.floor(crypto.randomBytes(1)[0] / 256 * (i + 1));
        const tmp = passwordArray[i]; passwordArray[i] = passwordArray[j]; passwordArray[j] = tmp;
      }
      return passwordArray.join('');
    }

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


    // If username is not provided, derive it from the email local-part (alias)
    if ((!username || username.toString().trim().length === 0) && email) {
      const alias = String(email).split('@')[0] || 'user';
      // sanitize: allow alnum, dot, underscore and dash
      const base = alias.replace(/[^A-Za-z0-9._-]/g, '').slice(0, 90) || 'user';
      let candidate = base;
      let suffix = 0;
      // ensure uniqueness by appending numeric suffix if needed
      while (await User.findByUsername(candidate)) {
        suffix += 1;
        const suffixStr = String(suffix);
        const maxBaseLen = 100 - suffixStr.length;
        candidate = (base.slice(0, Math.max(1, maxBaseLen))) + suffixStr;
      }
      username = candidate;
    }

    // Проверить уникальность username (if present now)
    if (username) {
      const existingUserByUsername = await User.findByUsername(username);
      if (existingUserByUsername) {
        const error = new Error('Username already exists');
        error.statusCode = 409;
        throw error;
      }
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

    // Если пароль не передан — сгенерируем надёжный временный пароль
    let plainPassword = password;
    if (!plainPassword) {
      plainPassword = generateStrongPassword(16);
    }

    // Хешировать пароль
    const password_hash = await hashPassword(plainPassword);

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
      group_id,
      organization_id,
      job_title_id,
      is_active: is_active !== undefined ? is_active : true,
      is_verified: is_verified !== undefined ? is_verified : false
    });

    // Send welcome/creation email to the new user (non-blocking, log errors)
    (async () => {
      try {
        const frontendRoot = process.env.FRONTEND_URL || '';
        const loginUrl = frontendRoot ? `${frontendRoot.replace(/\/$/, '')}/login` : '';
        const company = {
          name: process.env.COMPANY_NAME || 'Deep Sea',
          logo_url: process.env.COMPANY_LOGO_URL || '',
          address: process.env.COMPANY_ADDRESS || ''
        };
        const support_email = process.env.SUPPORT_EMAIL || process.env.EMAIL_FROM || '';
        const context = { user: newUser, actor: actor || null, loginUrl, company, support_email, password: plainPassword };
        const rendered = await NotificationTemplateService.render('user_created', 'email', context);
        const subject = rendered.subject || `Welcome, ${newUser.username}`;
        await EmailService.sendMail({ to: newUser.email, subject, text: rendered.text, html: rendered.html });
      } catch (e) {
        // Log but don't fail user creation if email sending fails
        console.error('Failed to send user creation email', e && e.message ? e.message : e);
      }
    })();

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
      group_id: newUser.group_id,
      organization_id: newUser.organization_id,
      job_title_id: newUser.job_title_id,
      is_active: newUser.is_active,
      is_verified: newUser.is_verified,
      created_at: newUser.created_at,
      updated_at: newUser.updated_at
    };
  }

  /**
   * Get aggregated statistics for a given user.
   * Returns project count, issues counts, documents counts and customer question counts.
   */
  static async getUserStatistics(userId, actor) {
    const pool = require('../../db/connection');
    const Project = require('../../db/models/Project');
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    // allow if actor has users.view or is requesting their own stats
    const allowed = await hasPermission(actor, 'users.view');
    if (!allowed && Number(actor.id) !== Number(userId)) { const err = new Error('Forbidden: missing permission users.view'); err.statusCode = 403; throw err; }

    const uid = Number(userId);

    // projects count (assigned via user_roles)
    const projectIds = await Project.listAssignedProjectIds(uid);
    const projects_count = (projectIds || []).length;

    // issues: total, open (status.is_final != true), added last 7 days (author)
    const issuesTotalRes = await pool.query(`SELECT COUNT(*) AS cnt FROM issues WHERE (assignee_id = $1 OR author_id = $1) AND is_active = true`, [uid]);
    const issues_total = Number(issuesTotalRes.rows[0] ? issuesTotalRes.rows[0].cnt : 0);

    const issuesOpenRes = await pool.query(`SELECT COUNT(*) AS cnt FROM issues i JOIN issue_status s ON i.status_id = s.id WHERE (i.assignee_id = $1 OR i.author_id = $1) AND (s.is_final IS NOT TRUE) AND i.is_active = true`, [uid]);
    const issues_open = Number(issuesOpenRes.rows[0] ? issuesOpenRes.rows[0].cnt : 0);

    const issuesWeekRes = await pool.query(`SELECT COUNT(*) AS cnt FROM issues WHERE author_id = $1 AND created_at >= (NOW() - INTERVAL '7 days') AND is_active = true`, [uid]);
    const issues_last_week = Number(issuesWeekRes.rows[0] ? issuesWeekRes.rows[0].cnt : 0);

    // documents: total, open (document_status.is_final != true), added last 7 days (created_by)
    const docsTotalRes = await pool.query(`SELECT COUNT(*) AS cnt FROM documents WHERE (created_by = $1 OR responsible_id = $1) AND is_active = true`, [uid]);
    const documents_total = Number(docsTotalRes.rows[0] ? docsTotalRes.rows[0].cnt : 0);

    const docsOpenRes = await pool.query(`SELECT COUNT(*) AS cnt FROM documents d JOIN document_status s ON d.status_id = s.id WHERE (d.created_by = $1 OR d.responsible_id = $1) AND (s.is_final IS NOT TRUE) AND d.is_active = true`, [uid]);
    const documents_open = Number(docsOpenRes.rows[0] ? docsOpenRes.rows[0].cnt : 0);

    const docsWeekRes = await pool.query(`SELECT COUNT(*) AS cnt FROM documents WHERE (created_by = $1 OR responsible_id = $1) AND created_at >= (NOW() - INTERVAL '7 days') AND is_active = true`, [uid]);
    const documents_last_week = Number(docsWeekRes.rows[0] ? docsWeekRes.rows[0].cnt : 0);

    // customer questions: total, open (status.is_final != true), added last 7 days (asked_by)
    const cqTotalRes = await pool.query(`SELECT COUNT(*) AS cnt FROM customer_questions WHERE (asked_by = $1 OR answered_by = $1) AND is_active = true`, [uid]);
    const customer_questions_total = Number(cqTotalRes.rows[0] ? cqTotalRes.rows[0].cnt : 0);

    const cqOpenRes = await pool.query(`SELECT COUNT(*) AS cnt FROM customer_questions cq JOIN customer_question_status cs ON cq.status_id = cs.id WHERE (cq.asked_by = $1 OR cq.answered_by = $1) AND (cs.is_final IS NOT TRUE) AND cq.is_active = true`, [uid]);
    const customer_questions_open = Number(cqOpenRes.rows[0] ? cqOpenRes.rows[0].cnt : 0);

    const cqWeekRes = await pool.query(`SELECT COUNT(*) AS cnt FROM customer_questions WHERE asked_by = $1 AND created_at >= (NOW() - INTERVAL '7 days') AND is_active = true`, [uid]);
    const customer_questions_last_week = Number(cqWeekRes.rows[0] ? cqWeekRes.rows[0].cnt : 0);

    return {
      projects_count,
      issues: {
        total: issues_total,
        open: issues_open,
        last_week: issues_last_week
      },
      documents: {
        total: documents_total,
        open: documents_open,
        last_week: documents_last_week
      },
      customer_questions: {
        total: customer_questions_total,
        open: customer_questions_open,
        last_week: customer_questions_last_week
      }
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
      avatar_id: user.avatar_id,
      email: user.email,
      phone: user.phone,
      first_name: user.first_name,
      last_name: user.last_name,
      middle_name: user.middle_name,
      department_id: user.department_id,
      department: user.department,
      group_id: user.group_id,
      group: user.group_name || null,
      organization_id: user.organization_id,
      organization: user.organization_name || null,
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
    // Allow arbitrary limit from client (minimum 1). No default limit — return all if not specified.
    const hasLimit = query.limit != null && query.limit !== '';
    const limit = hasLimit ? Math.max(parseInt(query.limit, 10) || 1, 1) : undefined;
    const offset = limit ? (page - 1) * limit : 0;

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

/**
 * Update profile for the current user (no admin permission required)
 * Allows updating: email, phone, first_name, last_name, middle_name
 */
UsersService.updateProfile = async function (id, fields, actor) {
  if (!actor || !actor.id) {
    const err = new Error('Authentication required'); err.statusCode = 401; throw err;
  }
  if (Number(actor.id) !== Number(id)) {
    const err = new Error('Forbidden'); err.statusCode = 403; throw err;
  }

  // Prevent changing password via this endpoint
  if (fields.password || fields.password_hash) {
    const err = new Error('Password cannot be changed via this endpoint'); err.statusCode = 400; throw err;
  }

  // Validate uniqueness for email/phone
  const User = require('../../db/models/User');
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


