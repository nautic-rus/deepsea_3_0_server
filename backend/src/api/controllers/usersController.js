/**
 * Контроллер для работы с пользователями
 *
 * UsersController
 *
 * Controller for user management endpoints: create, list, retrieve, update,
 * and delete. Delegates business logic to UsersService.
 */

const UsersService = require('../services/usersService');
const User = require('../../db/models/User');
const PasswordResetService = require('../services/passwordResetService');
const NotificationTemplateService = require('../services/notificationTemplateService');
const EmailService = require('../services/emailService');
const { hasPermission } = require('../services/permissionChecker');
const { hashPassword } = require('../../utils/password');

class UsersController {
  /**
   * Create a new user.
   */
  static async createUser(req, res, next) {
    try {
      const userData = req.body;
      // Передаём объект текущего пользователя (если установлен middleware аутентификации)
      const actor = req.user || null;
      const newUser = await UsersService.createUser(userData, actor);

      res.status(201).json({
        message: 'User created successfully',
        user: newUser
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send invitation emails to multiple users using `user_created` template.
   * Body: { user_ids: [1,2,3] }
   */
  static async inviteUsers(req, res, next) {
    try {
      const actor = req.user || null;
      if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
      const allowed = await hasPermission(actor, 'users.update');
      if (!allowed) { const err = new Error('Forbidden: missing permission users.update'); err.statusCode = 403; throw err; }

      const body = req.body || {};
      const userIds = Array.isArray(body.user_ids) ? body.user_ids.map(Number).filter(n => !Number.isNaN(n) && n > 0) : [];
      if (userIds.length === 0) { const err = new Error('user_ids required'); err.statusCode = 400; throw err; }

      const results = [];
      const frontendRoot = process.env.FRONTEND_URL || '';
      const loginUrl = frontendRoot ? `${frontendRoot.replace(/\/$/, '')}/login` : '';
      const company = { name: process.env.COMPANY_NAME || 'Deep Sea', logo_url: process.env.COMPANY_LOGO_URL || '', address: process.env.COMPANY_ADDRESS || '' };
      const support_email = process.env.SUPPORT_EMAIL || process.env.EMAIL_FROM || '';

      // helper: generate strong temporary password
      function generateStrongPassword(length = 16) {
        const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lower = 'abcdefghijklmnopqrstuvwxyz';
        const digits = '0123456789';
        const symbols = '!@#$%^&*()-_=+[]{};:,.<>?';
        const all = upper + lower + digits + symbols;
        const rnd = (chars) => chars[Math.floor(Math.random() * chars.length)];
        const required = [rnd(upper), rnd(lower), rnd(digits), rnd(symbols)];
        const rest = [];
        for (let i = 0; i < length - required.length; i++) rest.push(rnd(all));
        const arr = required.concat(rest);
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
        }
        return arr.join('');
      }

      for (const id of userIds) {
        try {
          const user = await User.findById(Number(id));
          if (!user) { results.push({ id, ok: false, reason: 'not_found' }); continue; }

          // generate temporary password, hash and persist
          const plainPassword = generateStrongPassword(12);
          const password_hash = await hashPassword(plainPassword);
          await User.setPassword(Number(id), password_hash);

          const context = { user, actor: actor || null, loginUrl, company, support_email, password: plainPassword };
          const rendered = await NotificationTemplateService.render('user_created', 'email', context);
          const subject = rendered.subject || `Welcome, ${user.username || user.email}`;
          await EmailService.sendMail({ to: user.email, subject, text: rendered.text, html: rendered.html });
          results.push({ id, ok: true });
        } catch (e) {
          results.push({ id, ok: false, reason: e && e.message ? e.message : String(e) });
        }
      }

      res.status(200).json({ results });
    } catch (error) { next(error); }
  }

  /**
   * Send password reset emails to multiple users.
   * Body: { user_ids: [1,2,3] }
   */
  static async sendPasswordResets(req, res, next) {
    try {
      const actor = req.user || null;
      if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
      const allowed = await hasPermission(actor, 'users.update');
      if (!allowed) { const err = new Error('Forbidden: missing permission users.update'); err.statusCode = 403; throw err; }

      const body = req.body || {};
      const userIds = Array.isArray(body.user_ids) ? body.user_ids.map(Number).filter(n => !Number.isNaN(n) && n > 0) : [];
      if (userIds.length === 0) { const err = new Error('user_ids required'); err.statusCode = 400; throw err; }

      const results = [];
      for (const id of userIds) {
        try {
          const user = await User.findById(Number(id));
          if (!user) { results.push({ id, ok: false, reason: 'not_found' }); continue; }
          // reuse PasswordResetService which will create token and send email
          await PasswordResetService.createTokenForEmail(user.email);
          results.push({ id, ok: true });
        } catch (e) {
          results.push({ id, ok: false, reason: e && e.message ? e.message : String(e) });
        }
      }

      res.status(200).json({ results });
    } catch (error) { next(error); }
  }

  /**
   * List users (supports pagination and search).
   */
  static async getUsers(req, res, next) {
    try {
      const query = req.query || {};
      const actor = req.user || null;
      const result = await UsersService.listUsers(query, actor);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a user by id.
   */
  static async getUser(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const actor = req.user || null;
      const user = await UsersService.getUserById(id, actor);

      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update current user's profile (email, phone, first_name, last_name, middle_name, rocket_login)
   */
  static async updateProfile(req, res, next) {
    try {
      const actor = req.user || null;
      if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }

      const body = req.body || {};
      const allowedFields = ['email','phone','first_name','last_name','middle_name'];
      const fields = {};
      for (const k of allowedFields) {
        if (Object.prototype.hasOwnProperty.call(body, k)) fields[k] = body[k];
      }

      const updated = await UsersService.updateProfile(Number(actor.id), fields, actor);

      // handle rocket_login separately via UserRocketChatService
      if (Object.prototype.hasOwnProperty.call(body, 'rocket_login')) {
        const UserRocketChatService = require('../services/userRocketChatService');
        const rc = body.rocket_login && String(body.rocket_login).trim();
        if (!rc) {
          // empty value -> delete mapping
          await UserRocketChatService.deleteMapping(Number(actor.id));
        } else {
          await UserRocketChatService.setMapping(Number(actor.id), { rc_username: rc }, actor);
        }
      }

      const UserModel = require('../../db/models/User');
      const user = await UserModel.findById(Number(actor.id));
      res.status(200).json({ user });
    } catch (error) { next(error); }
  }

  /**
   * Update a user (partial update).
   */
  static async updateUser(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const actor = req.user || null;
      const fields = req.body || {};
      const updated = await UsersService.updateUser(id, fields, actor);
      res.status(200).json({ user: updated });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload avatar for a user. Accepts multipart/form-data with field 'file'.
   * Query/body param `storage` can be 'local' or 's3' (default: 'local').
   */
  static async uploadAvatar(req, res, next) {
    try {
      const actor = req.user || null;
      if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
      const file = req.file;
      if (!file) { const err = new Error('Missing file'); err.statusCode = 400; throw err; }

      // Store avatars in S3. Use `avatars` prefix by default; allow overriding via body.directory
      const StorageService = require('../services/storageService');
      const opts = {};
      if (req.body && req.body.directory) opts.directory = String(req.body.directory);
      // default prefix
      if (!opts.directory) opts.directory = 'avatars';
      const createdStorage = await StorageService.uploadAndCreate(file, actor, opts);

      // Update current user's avatar_id to the storage record id returned by storage.
      const UserModel = require('../../db/models/User');
      const updatedUser = await UserModel.setAvatar(Number(actor.id), createdStorage.id);
      if (!updatedUser) { const err = new Error('User not found'); err.statusCode = 404; throw err; }

      res.status(200).json({ user: updatedUser, storage: createdStorage });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a user (soft-delete).
   */
  static async deleteUser(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const actor = req.user || null;
      await UsersService.deleteUser(id, actor);
      res.status(200).json({ message: 'User deleted' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = UsersController;




