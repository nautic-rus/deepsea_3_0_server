/**
 * Главный файл роутов — содержит все маршруты, сгруппированные по категориям.
 */

const express = require('express');
const router = express.Router();

// Controllers
const authController = require('../controllers/authController');
const usersController = require('../controllers/usersController');
const departmentsController = require('../controllers/departmentsController');
const rolesController = require('../controllers/rolesController');
const projectsController = require('../controllers/projectsController');
const issuesController = require('../controllers/issuesController');
const documentsController = require('../controllers/documentsController');

// Validators and middleware
const { validateLogin } = require('../validators/authValidator');
const { validateCreateUser } = require('../validators/usersValidator');
const authMiddleware = require('../middleware/authMiddleware');

// ===== Auth routes =====
// POST /api/auth/login
router.post('/auth/login', validateLogin, authController.login);
// POST /api/auth/refresh
router.post('/auth/refresh', authController.refresh);
// POST /api/auth/logout
router.post('/auth/logout', authMiddleware, authController.logout);
// GET /api/auth/me
router.get('/auth/me', authMiddleware, authController.me);

// ===== Users routes =====
// POST /api/create_users
router.post('/create_users', authMiddleware, validateCreateUser, usersController.createUser);

// GET /api/users (list)
router.get('/users', authMiddleware, usersController.getUsers);

// GET /api/users/:id (single user)
router.get('/users/:id', authMiddleware, usersController.getUser);

// PUT /api/users/:id (update)
router.put('/users/:id', authMiddleware, usersController.updateUser);
// DELETE /api/users/:id (soft-delete)
router.delete('/users/:id', authMiddleware, usersController.deleteUser);

// ===== Departments routes =====
// GET /api/departments
router.get('/departments', authMiddleware, departmentsController.list);
// POST /api/departments
router.post('/departments', authMiddleware, departmentsController.create);
// PUT /api/departments/:id
router.put('/departments/:id', authMiddleware, departmentsController.update);
// DELETE /api/departments/:id
router.delete('/departments/:id', authMiddleware, departmentsController.delete);

// ===== Roles routes =====
// GET /api/roles
router.get('/roles', authMiddleware, rolesController.list);
// POST /api/roles
router.post('/roles', authMiddleware, rolesController.create);
// PUT /api/roles/:id
router.put('/roles/:id', authMiddleware, rolesController.update);
// DELETE /api/roles/:id
router.delete('/roles/:id', authMiddleware, rolesController.delete);

// ===== Projects routes =====
// GET /api/projects
router.get('/projects', authMiddleware, projectsController.list);
// GET /api/projects/:id
router.get('/projects/:id', authMiddleware, projectsController.get);
// POST /api/projects
router.post('/projects', authMiddleware, projectsController.create);
// PUT /api/projects/:id
router.put('/projects/:id', authMiddleware, projectsController.update);
// DELETE /api/projects/:id
router.delete('/projects/:id', authMiddleware, projectsController.delete);

// ===== Issues routes =====
// GET /api/issues
router.get('/issues', authMiddleware, issuesController.list);
// GET /api/issues/:id
router.get('/issues/:id', authMiddleware, issuesController.get);
// POST /api/issues
router.post('/issues', authMiddleware, issuesController.create);
// PUT /api/issues/:id
router.put('/issues/:id', authMiddleware, issuesController.update);
// DELETE /api/issues/:id
router.delete('/issues/:id', authMiddleware, issuesController.delete);

// ===== Documents routes =====
// GET /api/documents
router.get('/documents', authMiddleware, documentsController.list);
// GET /api/documents/:id
router.get('/documents/:id', authMiddleware, documentsController.get);
// POST /api/documents
router.post('/documents', authMiddleware, documentsController.create);
// PUT /api/documents/:id
router.put('/documents/:id', authMiddleware, documentsController.update);
// DELETE /api/documents/:id
router.delete('/documents/:id', authMiddleware, documentsController.delete);

module.exports = router;

