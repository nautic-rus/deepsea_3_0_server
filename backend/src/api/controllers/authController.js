/**
 * Контроллер аутентификации
 */

const AuthService = require('../services/authService');
const AuthError = require('../../errors/AuthError');

class AuthController {
  /**
   * Вход в систему
   */
  static async login(req, res, next) {
    try {
      const { username, password } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent') || '';

      const result = await AuthService.login(username, password, ipAddress, userAgent);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh tokens
   */
  static async refresh(req, res, next) {
    try {
      const { refresh_token } = req.body || {};
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent') || '';

      const result = await AuthService.refresh(refresh_token, ipAddress, userAgent);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout (deactivate current session)
   */
  static async logout(req, res, next) {
    try {
      // Expect Authorization: Bearer <token>
      const authHeader = req.headers.authorization || req.headers.Authorization;
      const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

      if (!token) {
        const err = new Error('Authentication required');
        err.statusCode = 401;
        throw err;
      }

      await AuthService.logout(token);

      res.status(200).json({ message: 'Logged out' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Return current authenticated user
   */
  static async me(req, res, next) {
    try {
      // authMiddleware should populate req.user
      const user = req.user || null;
      if (!user) {
        const err = new Error('Authentication required');
        err.statusCode = 401;
        throw err;
      }

      // Prepare a sanitized copy for the public /me endpoint.
      // Do not expose internal permissions array. Return department and job_title as text.
      const out = {
        id: user.id,
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        department: user.department || null,
        job_title: user.job_title || null,
        is_active: user.is_active
      };

      res.status(200).json(out);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;

