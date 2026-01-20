/**
 * Authentication HTTP controller
 *
 * Handles login, token refresh, logout and the /me endpoint. Delegates
 * auth logic to AuthService and returns sanitized responses.
 */

const AuthService = require('../services/authService');
const AuthError = require('../../errors/AuthError');

class AuthController {
  /**
   * Login handler.
   *
   * Expects { username, password } in the request body and returns tokens
   * and user info on success.
   */
  static async login(req, res, next) {
    try {
  const { username, email, password } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent') || '';

  // Allow login by username OR email. Pass identifier to service.
  const identifier = username || email || null;
  const result = await AuthService.login(identifier, password, ipAddress, userAgent);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh access and refresh tokens using a refresh token.
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
   * Logout handler - deactivates the current session identified by the
   * Authorization bearer token.
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
   * Return current authenticated user (/me).
   *
   * Returns a sanitized user object for the authenticated request.
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

  /**
   * Request password reset by email. Public endpoint: { email }
   */
  static async requestPasswordReset(req, res, next) {
    try {
      const { email } = req.body || {};
      const PasswordResetService = require('../services/passwordResetService');
      await PasswordResetService.createTokenForEmail(email);
      // Always return 200 to avoid email enumeration
      res.status(200).json({ message: 'If an account with that email exists, password reset instructions have been sent.' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset password using token: { token, password }
   */
  static async resetPassword(req, res, next) {
    try {
      const { token, password } = req.body || {};
      const PasswordResetService = require('../services/passwordResetService');
      const updatedUser = await PasswordResetService.resetPassword(token, password);
      res.status(200).json({ message: 'Password updated', user: updatedUser });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;




