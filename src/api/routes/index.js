/**
 * Главный файл роутов — содержит все маршруты, сгруппированные по категориям.
 *
 * Примечание: JSDoc `@swagger` убраны — спецификация генерируется/хранится в
 * `backend/docs/api/swagger.json` (единичный источник правды).
 */

const express = require('express');
const router = express.Router();

// Controllers
const authController = require('../controllers/authController');
const usersController = require('../controllers/usersController');

// Validators and middleware
const { validateLogin } = require('../validators/authValidator');
const { validateCreateUser } = require('../validators/usersValidator');
const authMiddleware = require('../middleware/authMiddleware');

// ===== Auth routes =====
// POST /api/auth/login
router.post('/auth/login', validateLogin, authController.login);

// ===== Users routes =====
// POST /api/create_users
router.post('/create_users', authMiddleware, validateCreateUser, usersController.createUser);

// GET /api/users (list)
router.get('/users', authMiddleware, usersController.getUsers);

// GET /api/users/:id (single user)
router.get('/users/:id', authMiddleware, usersController.getUser);

module.exports = router;

