/**
 * Контроллер для работы с пользователями
 *
 * UsersController
 *
 * Controller for user management endpoints: create, list, retrieve, update,
 * and delete. Delegates business logic to UsersService.
 */

const UsersService = require('../services/usersService');

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




