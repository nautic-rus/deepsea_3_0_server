/**
 * Middleware для аутентификации и подгрузки разрешений пользователя
 */

const { verifyAccessToken } = require('../../utils/jwt');
const User = require('../../db/models/User');
const Session = require('../../db/models/Session');
const pool = require('../../db/connection');

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    let token = null;

    // Prefer Authorization header Bearer token, but fall back to HttpOnly cookie
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
      // eslint-disable-next-line no-console
      // console.debug('authMiddleware: using token from Authorization header');
    } else if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
      // eslint-disable-next-line no-console
      // console.debug('authMiddleware: using token from access_token cookie');
    }

    if (!token) {
      const err = new Error('Authentication required');
      err.statusCode = 401;
      throw err;
    }

    // Верифицируем JWT и получаем полезную нагрузку
  const payload = verifyAccessToken(token);

    if (!payload || !payload.id) {
      const err = new Error('Invalid token payload');
      err.statusCode = 401;
      throw err;
    }

    // Подгружаем пользователя из БД (без password_hash)
    const user = await User.findById(payload.id);
    if (!user) {
      const err = new Error('User not found');
      err.statusCode = 401;
      throw err;
    }

    if (!user.is_active) {
      const err = new Error('User account is deactivated');
      err.statusCode = 403;
      throw err;
    }

    // Проверим, есть ли активная сессия для данного access token
    // Если сессия неактивна/не найдена — отклоняем запрос
    try {
      const session = await Session.findByToken(token);
      if (!session) {
        const err = new Error('Session is inactive or invalid');
        err.statusCode = 401;
        throw err;
      }

      // Дополнительная проверка: совпадает ли user_id в сессии с payload.user
      if (session.user_id !== user.id) {
        const err = new Error('Session user mismatch');
        err.statusCode = 401;
        throw err;
      }

      // Проверим expires_at (если указано). По умолчанию мы не деактивируем
      // сессию автоматически при истечении expires_at — это позволяет клиенту
      // вызвать /api/auth/refresh и получить новый pair (refresh được работать
      // даже если access token истёк). Если требуется прежнее поведение, можно
      // включить деактивацию установкой SESSION_DEACTIVATE_ON_EXPIRE=true в env.
      if (session.expires_at) {
        const exp = new Date(session.expires_at);
        if (exp.getTime() <= Date.now()) {
          // Если необходимо — деактивируем старую сессию (по флагу окружения).
          // По умолчанию флаг выключен (не деактивируем) чтобы не блокировать
          // последующий refresh. Установите SESSION_DEACTIVATE_ON_EXPIRE=true
          // в production, если нужна строгая деактивация при первом обращении.
          try {
            if (String(process.env.SESSION_DEACTIVATE_ON_EXPIRE || '').toLowerCase() === 'true') {
              await Session.deactivate(session.token);
            }
          } catch (e) { /* ignore */ }

          const err = new Error('Session expired');
          err.statusCode = 401;
          throw err;
        }
      }
    } catch (e) {
      // если было наше намеренное исключение — пробросим дальше
      if (e.statusCode) throw e;
      // иначе — лог и отказ
      // eslint-disable-next-line no-console
      console.warn('Session check failed for token:', e.message);
      const err = new Error('Session validation failed');
      err.statusCode = 401;
      throw err;
    }

    // Подгружаем список кодов разрешений для пользователя. Вынесено в модель/сервис.
    let permissions = [];
    try {
      const PermissionModel = require('../../db/models/Permission');
      const permQuery = `
        SELECT DISTINCT p.code
        FROM permissions p
        JOIN role_permissions rp ON rp.permission_id = p.id
        JOIN user_roles ur ON ur.role_id = rp.role_id
        WHERE ur.user_id = $1
      `;
      // Используем pool напрямую здесь для совместимости с существующей структурой
      const permsRes = await require('../../db/connection').query(permQuery, [user.id]);
  // normalize permission codes (trim + lowercase) to make comparisons reliable
  permissions = permsRes.rows.map(r => (r.code || '').trim().toLowerCase()).filter(Boolean);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to load permissions for user', user.id, e.message);
      permissions = [];
    }

    // Попробуем получить текстовые наименования отдела и должности
    let department = null;
    let jobTitle = null;
    try {
      if (user.department_id) {
        const Department = require('../../db/models/Department');
        department = await Department.findNameById(user.department_id);
      }
      if (user.job_title_id) {
        const JobTitle = require('../../db/models/JobTitle');
        jobTitle = await JobTitle.findNameById(user.job_title_id);
      }
    } catch (e) {
      // Не фатальная ошибка — логируем и продолжаем без текстовых значений
      // eslint-disable-next-line no-console
      console.warn('Failed to load department/job_title names for user', user.id, e.message);
    }

    // Установим req.user (включаем как id ссылки, так и текстовые значения)
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      department_id: user.department_id,
      job_title_id: user.job_title_id,
      department: department,
      job_title: jobTitle,
      is_active: user.is_active,
      permissions
    };

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = authMiddleware;
