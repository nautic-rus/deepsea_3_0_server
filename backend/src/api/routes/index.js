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
const issueHistoryController = require('../controllers/issueHistoryController');
const documentHistoryController = require('../controllers/documentHistoryController');
const materialsController = require('../controllers/materialsController');
const equipmentController = require('../controllers/equipmentController');
const materialKitsController = require('../controllers/materialKitsController');
const specificationsController = require('../controllers/specificationsController');
const stagesController = require('../controllers/stagesController');
const storageController = require('../controllers/storageController');
const multer = require('multer');
const _upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
const statementsController = require('../controllers/statementsController');
const permissionsController = require('../controllers/permissionsController');
const userPagesController = require('../controllers/userPagesController');
const userProjectsController = require('../controllers/userProjectsController');
const userRocketChatController = require('../controllers/userRocketChatController');
const userNotificationSettingsController = require('../controllers/userNotificationSettingsController');
const userNotificationsController = require('../controllers/userNotificationsController');

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

// Rocket.Chat mapping for user
router.get('/users/:id/rocket_chat', authMiddleware, userRocketChatController.get);
router.post('/users/:id/rocket_chat', authMiddleware, userRocketChatController.set);
router.delete('/users/:id/rocket_chat', authMiddleware, userRocketChatController.remove);

// User notification settings
router.get('/users/:id/notification_settings', authMiddleware, userNotificationSettingsController.list);
router.post('/users/:id/notification_settings', authMiddleware, userNotificationSettingsController.upsert);
router.delete('/users/:id/notification_settings', authMiddleware, userNotificationSettingsController.remove);

// User notification center endpoints
router.get('/users/:id/notifications', authMiddleware, userNotificationsController.list);
router.get('/users/:id/notifications/unread_count', authMiddleware, userNotificationsController.unreadCount);
router.post('/users/:id/notifications/:notificationId/read', authMiddleware, userNotificationsController.markAsRead);
router.post('/users/:id/notifications/:notificationId/hide', authMiddleware, userNotificationsController.markAsHidden);

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
// GET /api/roles/:id/permissions
router.get('/roles/:id/permissions', authMiddleware, rolesController.getPermissions);
// GET /api/roles/permissions?role_id= - fallback when id is not provided in path
router.get('/roles/permissions', authMiddleware, rolesController.getPermissionsByQuery);

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
// GET /api/projects/:id/assignments
router.get('/projects/:id/assignments', authMiddleware, userProjectsController.listByProject);
// POST /api/projects/assign
router.post('/projects/assign', authMiddleware, userProjectsController.assign);
// DELETE /api/projects/:id/assignments - unassign user(s)/role(s) via request body
router.delete('/projects/:id/assignments', authMiddleware, userProjectsController.unassign);

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
// POST /api/issues/:id/assign - assign/change assignee for an issue
router.post('/issues/:id/assign', authMiddleware, issuesController.assign);
// POST /api/issues/:id/messages - add comment/message to an issue
router.post('/issues/:id/messages', authMiddleware, issuesController.addMessage);
// POST /api/issues/:id/files - attach file to issue
// POST /api/issues/:id/files - attach file to issue (supports multipart field 'file' or JSON { storage_id })
router.post('/issues/:id/files', authMiddleware, _upload.single('file'), issuesController.attachFile);
// POST /api/issues/:id/files/local - upload file to local storage and attach
router.post('/issues/:id/files/local', authMiddleware, _upload.single('file'), issuesController.attachLocalFile);
// DELETE /api/issues/:id/files/:storage_id - detach file from issue
router.delete('/issues/:id/files/:storage_id', authMiddleware, issuesController.detachFile);
// GET /api/issues/:id/files - list files attached to issue
router.get('/issues/:id/files', authMiddleware, issuesController.listFiles);
// GET /api/issues/:id/history - issue timeline/history
router.get('/issues/:id/history', authMiddleware, issueHistoryController.list);

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
// GET /api/documents/:id/history - document timeline/history
router.get('/documents/:id/history', authMiddleware, documentHistoryController.list);
// POST /api/documents/:id/messages - add comment/message to a document
router.post('/documents/:id/messages', authMiddleware, documentsController.addMessage);
// POST /api/documents/:id/files - attach file to document
// POST /api/documents/:id/files - attach file to document (supports multipart field 'file' or JSON { storage_id })
router.post('/documents/:id/files', authMiddleware, _upload.single('file'), documentsController.attachFile);
// POST /api/documents/:id/files/local - upload file to local storage and attach to document
router.post('/documents/:id/files/local', authMiddleware, _upload.single('file'), documentsController.attachLocalFile);
// DELETE /api/documents/:id/files/:storage_id - detach file from document
router.delete('/documents/:id/files/:storage_id', authMiddleware, documentsController.detachFile);
// GET /api/documents/:id/files - list files attached to document
router.get('/documents/:id/files', authMiddleware, documentsController.listFiles);

// ===== Materials routes =====
router.get('/materials', authMiddleware, materialsController.list);
// GET next stock code
router.get('/materials/next_stock_code', authMiddleware, materialsController.next_stock_code);
router.get('/materials/:id', authMiddleware, materialsController.get);
router.post('/materials', authMiddleware, materialsController.create);
router.put('/materials/:id', authMiddleware, materialsController.update);
router.delete('/materials/:id', authMiddleware, materialsController.delete);

// ===== Material kits routes =====
router.get('/material_kits', authMiddleware, materialKitsController.list);
router.post('/material_kits', authMiddleware, materialKitsController.create);
router.get('/material_kits/:id', authMiddleware, materialKitsController.getById);
router.put('/material_kits/:id', authMiddleware, materialKitsController.update);
router.delete('/material_kits/:id', authMiddleware, materialKitsController.delete);

// kit items
router.get('/material_kits/:kit_id/items', authMiddleware, materialKitsController.listItems);
router.post('/material_kits/:kit_id/items', authMiddleware, materialKitsController.createItem);
router.put('/material_kits/items/:id', authMiddleware, materialKitsController.updateItem);
router.delete('/material_kits/items/:id', authMiddleware, materialKitsController.deleteItem);

// apply kit to specification version
router.post('/material_kits/:id/apply', authMiddleware, materialKitsController.apply);

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
// POST /api/storage - supports multipart/form-data with field 'file'
router.post('/storage', authMiddleware, _upload.single('file'), storageController.create);
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

// ===== User pages (menu) =====
// GET /api/user/pages
router.get('/user/pages', authMiddleware, userPagesController.getPages);

module.exports = router;

