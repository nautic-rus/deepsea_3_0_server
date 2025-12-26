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
const materialsController = require('../controllers/materialsController');
const equipmentController = require('../controllers/equipmentController');
const specificationsController = require('../controllers/specificationsController');
const stagesController = require('../controllers/stagesController');
const storageController = require('../controllers/storageController');
const statementsController = require('../controllers/statementsController');
const permissionsController = require('../controllers/permissionsController');

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

// ===== Materials routes =====
router.get('/materials', authMiddleware, materialsController.list);
router.get('/materials/:id', authMiddleware, materialsController.get);
router.post('/materials', authMiddleware, materialsController.create);
router.put('/materials/:id', authMiddleware, materialsController.update);
router.delete('/materials/:id', authMiddleware, materialsController.delete);

// ===== Equipment routes =====
router.get('/equipment', authMiddleware, equipmentController.list);
router.get('/equipment/:id', authMiddleware, equipmentController.get);
router.post('/equipment', authMiddleware, equipmentController.create);
router.put('/equipment/:id', authMiddleware, equipmentController.update);
router.delete('/equipment/:id', authMiddleware, equipmentController.delete);

// ===== Specifications routes =====
router.get('/specifications', authMiddleware, specificationsController.list);
router.get('/specifications/:id', authMiddleware, specificationsController.get);
router.post('/specifications', authMiddleware, specificationsController.create);
router.put('/specifications/:id', authMiddleware, specificationsController.update);
router.delete('/specifications/:id', authMiddleware, specificationsController.delete);

// ===== Stages routes =====
router.get('/stages', authMiddleware, stagesController.list);
router.get('/stages/:id', authMiddleware, stagesController.get);
router.post('/stages', authMiddleware, stagesController.create);
router.put('/stages/:id', authMiddleware, stagesController.update);
router.delete('/stages/:id', authMiddleware, stagesController.delete);

// ===== Storage routes =====
router.get('/storage', authMiddleware, storageController.list);
router.get('/storage/:id', authMiddleware, storageController.get);
router.post('/storage', authMiddleware, storageController.create);
router.put('/storage/:id', authMiddleware, storageController.update);
router.delete('/storage/:id', authMiddleware, storageController.delete);

// ===== Statements routes =====
router.get('/statements', authMiddleware, statementsController.list);
router.get('/statements/:id', authMiddleware, statementsController.get);
router.post('/statements', authMiddleware, statementsController.create);
router.put('/statements/:id', authMiddleware, statementsController.update);
router.delete('/statements/:id', authMiddleware, statementsController.delete);

// ===== Permissions routes =====
// GET /api/permissions
router.get('/permissions', authMiddleware, permissionsController.list);

module.exports = router;

