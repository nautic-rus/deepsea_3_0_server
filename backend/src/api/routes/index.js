/**
 * Главный файл роутов — содержит все маршруты, сгруппированные по категориям.
 */

const express = require('express');
const router = express.Router();

// Controllers
const authController = require('../controllers/authController');
const usersController = require('../controllers/usersController');
const departmentsController = require('../controllers/departmentsController');
const groupsController = require('../controllers/groupsController');
const organizationsController = require('../controllers/organizationsController');
const rolesController = require('../controllers/rolesController');
const projectsController = require('../controllers/projectsController');
const projectCharacteristicsController = require('../controllers/projectCharacteristicsController');
const projectImagesController = require('../controllers/projectImagesController');
const issuesController = require('../controllers/issuesController');
const documentsController = require('../controllers/documentsController');
const documentWorkFlowsController = require('../controllers/documentWorkFlowsController');
const specializationsController = require('../controllers/specializationsController');
const issueHistoryController = require('../controllers/issueHistoryController');
const documentHistoryController = require('../controllers/documentHistoryController');
const customerQuestionHistoryController = require('../controllers/customerQuestionHistoryController');
const materialsController = require('../controllers/materialsController');
const materialKitsController = require('../controllers/materialKitsController');
const unitsController = require('../controllers/unitsController');
const shipmentsController = require('../controllers/shipmentsController');
const suppliersController = require('../controllers/suppliersController');
const specificationsController = require('../controllers/specificationsController');
const stagesController = require('../controllers/stagesController');
const storageController = require('../controllers/storageController');
const multer = require('multer');
const _upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });
const statementsController = require('../controllers/statementsController');
const specificationPartsController = require('../controllers/specificationPartsController');
const materialsDirectoriesController = require('../controllers/materialsDirectoriesController');
const statementsVersionController = require('../controllers/statementsVersionController');
const statementsPartsController = require('../controllers/statementsPartsController');
const permissionsController = require('../controllers/permissionsController');
const userPagesController = require('../controllers/userPagesController');
const pagesController = require('../controllers/pagesController');
const pagePermissionsController = require('../controllers/pagePermissionsController');
const jobTitlesController = require('../controllers/jobTitlesController');
const userProjectsController = require('../controllers/userProjectsController');
const userRocketChatController = require('../controllers/userRocketChatController');
const userNotificationSettingsController = require('../controllers/userNotificationSettingsController');
const userNotificationsController = require('../controllers/userNotificationsController');
const entityLinksController = require('../controllers/entityLinksController');
const auditLogsController = require('../controllers/auditLogsController');
const customerQuestionsController = require('../controllers/customerQuestionsController');
const customerQuestionStatusesController = require('../controllers/customerQuestionStatusesController');
const customerQuestionWorkFlowsController = require('../controllers/customerQuestionWorkFlowsController');
const issueWorkFlowsController = require('../controllers/issueWorkFlowsController');
const notificationEventsController = require('../controllers/notificationEventsController');
const notificationMethodsController = require('../controllers/notificationMethodsController');
const environmentSettingsController = require('../controllers/environmentSettingsController');
const wikiArticlesController = require('../controllers/wikiArticlesController');
const wikiArticleStorageController = require('../controllers/wikiArticleStorageController');
const wikiSectionsController = require('../controllers/wikiSectionsController');
const wikiArticleFavoritesController = require('../controllers/wikiArticleFavoritesController');
const wikiArticleViewsController = require('../controllers/wikiArticleViewsController');
const timeLogsController = require('../controllers/timeLogsController');
const searchController = require('../controllers/searchController');

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
// POST /api/auth/request_password_reset
router.post('/auth/request_password_reset', authController.requestPasswordReset);
// POST /api/auth/reset_password
router.post('/auth/reset_password', authController.resetPassword);

// ===== Environment settings routes =====
router.get('/environment_settings', authMiddleware, environmentSettingsController.list);
router.get('/environment_settings/:key', authMiddleware, environmentSettingsController.get);
router.put('/environment_settings/:key', authMiddleware, environmentSettingsController.update);
router.patch('/environment_settings', authMiddleware, environmentSettingsController.updateMany);

// ===== Users routes =====
// POST /api/create_users
router.post('/create_users', authMiddleware, validateCreateUser, usersController.createUser);
router.post('/users/invite', authMiddleware, usersController.inviteUsers);

// GET /api/users (list)
router.get('/users', authMiddleware, usersController.getUsers);
// PUT /api/update_profile - update current user's profile
router.put('/update_profile', authMiddleware, usersController.updateProfile);

// User notification settings (current user)
router.get('/users/notification_settings', authMiddleware, userNotificationSettingsController.list);
router.post('/users/notification_settings', authMiddleware, userNotificationSettingsController.upsert);
router.delete('/users/notification_settings', authMiddleware, userNotificationSettingsController.remove);

// User notification center (current user) - placed before `/users/:id` to avoid route clash
router.get('/users/notifications', authMiddleware, userNotificationsController.list);

// GET /api/users/statistics (user statistics for current authenticated user)
router.get('/users/statistics', authMiddleware, usersController.getStatistics);

// GET /api/users/:id (single user)
router.get('/users/:id', authMiddleware, usersController.getUser);

// Rocket.Chat mapping for user
router.get('/users/:id/rocket_chat', authMiddleware, userRocketChatController.get);
router.post('/users/:id/rocket_chat', authMiddleware, userRocketChatController.set);
router.delete('/users/:id/rocket_chat', authMiddleware, userRocketChatController.remove);

// (routes for notification_settings moved above to avoid conflicting with /users/:id)

router.get('/users/:id/notifications', authMiddleware, userNotificationsController.list);
router.get('/users/:id/notifications/unread_count', authMiddleware, userNotificationsController.unreadCount);
router.post('/users/:id/notifications/:notificationId/read', authMiddleware, userNotificationsController.markAsRead);
router.post('/users/:id/notifications/:notificationId/hide', authMiddleware, userNotificationsController.markAsHidden);

// PUT /api/users/:id (update)
router.put('/users/:id', authMiddleware, usersController.updateUser);
// DELETE /api/users/:id (soft-delete)
router.delete('/users/:id', authMiddleware, usersController.deleteUser);
// POST /api/users/avatar - upload current user's avatar (multipart field 'file')
router.post('/users/avatar', authMiddleware, _upload.single('file'), usersController.uploadAvatar);
router.post('/users/password_reset', authMiddleware, usersController.sendPasswordResets);

// ===== Departments routes =====
// GET /api/departments
router.get('/departments', authMiddleware, departmentsController.list);
// POST /api/departments
router.post('/departments', authMiddleware, departmentsController.create);
// PUT /api/departments/:id
router.put('/departments/:id', authMiddleware, departmentsController.update);
// DELETE /api/departments/:id
router.delete('/departments/:id', authMiddleware, departmentsController.delete);

// ===== Groups routes =====
router.get('/groups', authMiddleware, groupsController.list);
router.post('/groups', authMiddleware, groupsController.create);
router.put('/groups/:id', authMiddleware, groupsController.update);
router.delete('/groups/:id', authMiddleware, groupsController.delete);

// ===== Organizations routes =====
router.get('/organizations', authMiddleware, organizationsController.list);
router.post('/organizations', authMiddleware, organizationsController.create);
router.put('/organizations/:id', authMiddleware, organizationsController.update);
router.delete('/organizations/:id', authMiddleware, organizationsController.delete);

// ===== Roles routes =====
// GET /api/roles
router.get('/roles', authMiddleware, rolesController.list);
// POST /api/roles
router.post('/roles', authMiddleware, rolesController.create);
// POST /api/roles/assign - assign global role(s) to a user (project_id = NULL)
router.post('/roles/assign', authMiddleware, rolesController.assignUser);
// DELETE /api/roles/unassign - remove global role(s) from a user (project_id = NULL)
router.delete('/roles/unassign', authMiddleware, rolesController.unassignUser);
// PUT /api/roles/:id
router.put('/roles/:id', authMiddleware, rolesController.update);
// DELETE /api/roles/:id
router.delete('/roles/:id', authMiddleware, rolesController.delete);
// GET /api/roles/:id/permissions
router.get('/roles/:id/permissions', authMiddleware, rolesController.getPermissions);
// POST /api/roles/:id/permissions - assign permission to role
router.post('/roles/:id/permissions', authMiddleware, rolesController.assignPermission);
// DELETE /api/roles/:id/permissions/:permission_id - remove permission from role
router.delete('/roles/:id/permissions/:permission_id', authMiddleware, rolesController.unassignPermission);
// GET /api/roles/permissions?role_id= - fallback when id is not provided in path
router.get('/roles/permissions', authMiddleware, rolesController.getPermissionsByQuery);

// ===== Projects routes =====
// GET /api/projects
router.get('/projects', authMiddleware, projectsController.list);
// GET /api/search - unified full-text search across entities
router.get('/search', authMiddleware, searchController.search);
// GET /api/my_projects - list projects assigned to current user (no additional permission required)
router.get('/my_projects', authMiddleware, projectsController.myProjects);
// GET /api/projects/:id
router.get('/projects/:id', authMiddleware, projectsController.get);
// POST /api/projects
router.post('/projects', authMiddleware, projectsController.create);
// PUT /api/projects/:id
router.put('/projects/:id', authMiddleware, projectsController.update);
// DELETE /api/projects/:id
router.delete('/projects/:id', authMiddleware, projectsController.delete);
// Project characteristics
// POST /api/projects/:id/characteristics - create or update characteristics
router.post('/projects/:id/characteristics', authMiddleware, projectCharacteristicsController.upsert);
router.put('/projects/:id/characteristics', authMiddleware, projectCharacteristicsController.upsert);
router.delete('/projects/:id/characteristics', authMiddleware, projectCharacteristicsController.remove);
// Project images
// POST /api/projects/:id/images - add image (body: { storage_id, is_main, caption, sort_order })
router.post('/projects/:id/images', authMiddleware, projectImagesController.create);
// PUT /api/projects/images/:id - update image
router.put('/projects/images/:id', authMiddleware, projectImagesController.update);
// DELETE /api/projects/images/:id - delete image
router.delete('/projects/images/:id', authMiddleware, projectImagesController.delete);
// GET /api/projects/:id/assignments
router.get('/projects/:id/assignments', authMiddleware, userProjectsController.listByProject);
// POST /api/projects/assign
router.post('/projects/assign', authMiddleware, userProjectsController.assign);
// DELETE /api/projects/:id/assignments - unassign user(s)/role(s) via request body
router.delete('/projects/:id/assignments', authMiddleware, userProjectsController.unassign);

// ===== Issues routes =====
// GET /api/issues
router.get('/issues', authMiddleware, issuesController.list);
// GET /api/issue_statuses - list available issue statuses
router.get('/issue_statuses', authMiddleware, issuesController.listStatuses);
// GET /api/issue_statuses/:id - get single issue status
router.get('/issue_statuses/:id', authMiddleware, issuesController.getStatus);
// Issue statuses CRUD
router.post('/issue_statuses', authMiddleware, issuesController.createStatus);
router.put('/issue_statuses/:id', authMiddleware, issuesController.updateStatus);
router.delete('/issue_statuses/:id', authMiddleware, issuesController.deleteStatus);
// GET /api/issue_types - list available issue types
router.get('/issue_types', authMiddleware, issuesController.listTypes);
// GET /api/issue_types/:id - get single issue type
router.get('/issue_types/:id', authMiddleware, issuesController.getType);
// Issue types CRUD
router.post('/issue_types', authMiddleware, issuesController.createType);
router.put('/issue_types/:id', authMiddleware, issuesController.updateType);
router.delete('/issue_types/:id', authMiddleware, issuesController.deleteType);
// GET /api/issues/:id
router.get('/issues/:id', authMiddleware, issuesController.get);
// POST /api/issues
router.post('/issues', authMiddleware, issuesController.create);
// PUT /api/issues/:id
router.put('/issues/:id', authMiddleware, issuesController.update);
// DELETE /api/issues/:id
router.delete('/issues/:id', authMiddleware, issuesController.delete);
// PATCH /api/issues/:id/status - update only the status of an issue
router.patch('/issues/:id/status', authMiddleware, issuesController.updateIssueStatus);
// POST /api/issues/:id/assign - assign/change assignee for an issue
router.post('/issues/:id/assign', authMiddleware, issuesController.assign);
// POST /api/issues/:id/messages - add comment/message to an issue
router.post('/issues/:id/messages', authMiddleware, issuesController.addMessage);
// GET /api/issues/:id/messages - list messages for an issue
router.get('/issues/:id/messages', authMiddleware, issuesController.listMessages);
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

// ===== Customer questions routes =====
router.get('/customer_questions', authMiddleware, customerQuestionsController.list);
router.get('/customer_questions/:id', authMiddleware, customerQuestionsController.get);
router.get('/customer_questions/:id/history', authMiddleware, customerQuestionHistoryController.list);
router.post('/customer_questions', authMiddleware, customerQuestionsController.create);
router.put('/customer_questions/:id', authMiddleware, customerQuestionsController.update);
router.delete('/customer_questions/:id', authMiddleware, customerQuestionsController.delete);
// files attached to customer question
router.post('/customer_questions/:id/files', authMiddleware, _upload.single('file'), customerQuestionsController.attachFile);
router.post('/customer_questions/:id/files/local', authMiddleware, _upload.single('file'), customerQuestionsController.attachLocalFile);
router.delete('/customer_questions/:id/files/:storage_id', authMiddleware, customerQuestionsController.detachFile);
router.get('/customer_questions/:id/files', authMiddleware, customerQuestionsController.listFiles);
// messages attached to customer question
router.post('/customer_questions/:id/messages', authMiddleware, customerQuestionsController.addMessage);
router.get('/customer_questions/:id/messages', authMiddleware, customerQuestionsController.listMessages);
// ===== Customer question types routes =====
router.get('/customer_question_types', authMiddleware, customerQuestionsController.listTypes);
router.get('/customer_question_types/:id', authMiddleware, customerQuestionsController.getType);
router.post('/customer_question_types', authMiddleware, customerQuestionsController.createType);
router.put('/customer_question_types/:id', authMiddleware, customerQuestionsController.updateType);
router.delete('/customer_question_types/:id', authMiddleware, customerQuestionsController.deleteType);

// ===== Customer question statuses routes =====
router.get('/customer_question_statuses', authMiddleware, customerQuestionStatusesController.list);
router.get('/customer_question_statuses/:id', authMiddleware, customerQuestionStatusesController.get);
router.post('/customer_question_statuses', authMiddleware, customerQuestionStatusesController.create);
router.put('/customer_question_statuses/:id', authMiddleware, customerQuestionStatusesController.update);
router.delete('/customer_question_statuses/:id', authMiddleware, customerQuestionStatusesController.delete);

// ===== Customer question work flows routes =====
router.get('/customer_question_work_flows', authMiddleware, customerQuestionWorkFlowsController.list);
router.get('/customer_question_work_flows/:id', authMiddleware, customerQuestionWorkFlowsController.get);
router.post('/customer_question_work_flows', authMiddleware, customerQuestionWorkFlowsController.create);
router.put('/customer_question_work_flows/:id', authMiddleware, customerQuestionWorkFlowsController.update);
router.delete('/customer_question_work_flows/:id', authMiddleware, customerQuestionWorkFlowsController.delete);

// ===== Issue work flows routes =====
router.get('/issue_work_flows', authMiddleware, issueWorkFlowsController.list);
router.get('/issue_work_flows/:id', authMiddleware, issueWorkFlowsController.get);
router.post('/issue_work_flows', authMiddleware, issueWorkFlowsController.create);
router.put('/issue_work_flows/:id', authMiddleware, issueWorkFlowsController.update);
router.delete('/issue_work_flows/:id', authMiddleware, issueWorkFlowsController.delete);

// ===== Notification events/methods (admin) =====
router.get('/notification_events', authMiddleware, notificationEventsController.list);
router.post('/notification_events', authMiddleware, notificationEventsController.create);
router.get('/notification_events/:id', authMiddleware, notificationEventsController.get);
router.put('/notification_events/:id', authMiddleware, notificationEventsController.update);
router.delete('/notification_events/:id', authMiddleware, notificationEventsController.remove);

router.get('/notification_methods', authMiddleware, notificationMethodsController.list);
router.post('/notification_methods', authMiddleware, notificationMethodsController.create);
router.get('/notification_methods/:id', authMiddleware, notificationMethodsController.get);
router.put('/notification_methods/:id', authMiddleware, notificationMethodsController.update);
router.delete('/notification_methods/:id', authMiddleware, notificationMethodsController.remove);

// ===== Documents routes =====
// GET /api/documents
router.get('/documents', authMiddleware, documentsController.list);
// GET /api/documents/statistics - documents statistics grouped by specialization and stage
router.get('/documents/statistics', authMiddleware, documentsController.statistics);
// Document directories routes must be registered before '/documents/:id' to avoid
// Express treating 'directories' as an :id parameter. Register them here.
// GET /api/documents/directories - list document directories
router.get('/documents/directories', authMiddleware, documentsController.listDirectories);
// POST /api/documents/directories - create
router.post('/documents/directories', authMiddleware, documentsController.createDirectory);
// PUT /api/documents/directories/:id - update
router.put('/documents/directories/:id', authMiddleware, documentsController.updateDirectory);
// DELETE /api/documents/directories/:id - delete
router.delete('/documents/directories/:id', authMiddleware, documentsController.deleteDirectory);
// Materials directories (CRUD)
router.get('/materials/directories', authMiddleware, materialsDirectoriesController.list);
router.get('/materials/directories/:id', authMiddleware, materialsDirectoriesController.get);
router.post('/materials/directories', authMiddleware, materialsDirectoriesController.create);
router.put('/materials/directories/:id', authMiddleware, materialsDirectoriesController.update);
router.delete('/materials/directories/:id', authMiddleware, materialsDirectoriesController.remove);
// Document types
router.get('/document_types', authMiddleware, documentsController.listTypes);
router.get('/document_types/:id', authMiddleware, documentsController.getType);
router.post('/document_types', authMiddleware, documentsController.createType);
router.put('/document_types/:id', authMiddleware, documentsController.updateType);
router.delete('/document_types/:id', authMiddleware, documentsController.deleteType);
// Document statuses (CRUD)
router.get('/document_statuses', authMiddleware, documentsController.listStatuses);
router.get('/document_statuses/:id', authMiddleware, documentsController.getStatus);
router.post('/document_statuses', authMiddleware, documentsController.createStatus);
router.put('/document_statuses/:id', authMiddleware, documentsController.updateStatus);
router.delete('/document_statuses/:id', authMiddleware, documentsController.deleteStatus);
// Document work flows (CRUD)
router.get('/document_work_flows', authMiddleware, documentWorkFlowsController.list);
router.get('/document_work_flows/:id', authMiddleware, documentWorkFlowsController.get);
router.post('/document_work_flows', authMiddleware, documentWorkFlowsController.create);
router.put('/document_work_flows/:id', authMiddleware, documentWorkFlowsController.update);
router.delete('/document_work_flows/:id', authMiddleware, documentWorkFlowsController.delete);
// Document storage types (CRUD)
router.get('/document_storage_types', authMiddleware, documentsController.listStorageTypes);
router.get('/document_storage_types/:id', authMiddleware, documentsController.getStorageType);
router.post('/document_storage_types', authMiddleware, documentsController.createStorageType);
router.put('/document_storage_types/:id', authMiddleware, documentsController.updateStorageType);
router.delete('/document_storage_types/:id', authMiddleware, documentsController.deleteStorageType);
// Documents storage statuses CRUD
router.get('/documents_storage_statuses', authMiddleware, documentsController.listStorageStatuses);
router.get('/documents_storage_statuses/:id', authMiddleware, documentsController.getStorageStatus);
router.post('/documents_storage_statuses', authMiddleware, documentsController.createStorageStatus);
router.put('/documents_storage_statuses/:id', authMiddleware, documentsController.updateStorageStatus);
router.delete('/documents_storage_statuses/:id', authMiddleware, documentsController.deleteStorageStatus);
// Documents storage reasons CRUD
router.get('/documents_storage_reasons', authMiddleware, documentsController.listStorageReasons);
router.get('/documents_storage_reasons/:id', authMiddleware, documentsController.getStorageReason);
router.post('/documents_storage_reasons', authMiddleware, documentsController.createStorageReason);
router.put('/documents_storage_reasons/:id', authMiddleware, documentsController.updateStorageReason);
router.delete('/documents_storage_reasons/:id', authMiddleware, documentsController.deleteStorageReason);
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
// GET /api/documents/:id/messages - list messages for a document
router.get('/documents/:id/messages', authMiddleware, documentsController.listMessages);
// POST /api/documents/:id/files - attach file to document
// POST /api/documents/:id/files - attach file to document (supports multipart field 'file' or JSON { storage_id })
router.post('/documents/:id/files', authMiddleware, _upload.single('file'), documentsController.attachFile);
// PUT /api/documents/:id/files - update metadata for an attached file
router.put('/documents/:id/files', authMiddleware, documentsController.updateFile);
// POST /api/documents/:id/files/local - upload file to local storage and attach to document
router.post('/documents/:id/files/local', authMiddleware, _upload.single('file'), documentsController.attachLocalFile);
// DELETE /api/documents/:id/files/:storage_id - detach file from document
router.delete('/documents/:id/files/:storage_id', authMiddleware, documentsController.detachFile);
// GET /api/documents/:id/files - list files attached to document
router.get('/documents/:id/files', authMiddleware, documentsController.listFiles);
// POST /api/documents/files/status - bulk update status for storage items
router.post('/documents/files/status', authMiddleware, documentsController.bulkUpdateFilesStatus);
// Specializations (CRUD)
router.get('/specializations', authMiddleware, specializationsController.list);
router.get('/specializations/:id', authMiddleware, specializationsController.get);
router.post('/specializations', authMiddleware, specializationsController.create);
router.put('/specializations/:id', authMiddleware, specializationsController.update);
router.delete('/specializations/:id', authMiddleware, specializationsController.delete);
// (document directories routes registered earlier)

// ===== Entity links routes =====
// POST /api/links - create a link between entities
router.post('/links', authMiddleware, entityLinksController.create);
// GET /api/links - list/find links
router.get('/links', authMiddleware, entityLinksController.list);
// DELETE /api/links/:id - remove a link
router.delete('/links/:id', authMiddleware, entityLinksController.remove);

// ===== Materials routes =====
router.get('/materials', authMiddleware, materialsController.list);
// GET next stock code
router.get('/materials/next_stock_code', authMiddleware, materialsController.next_stock_code);
router.get('/materials/:id', authMiddleware, materialsController.get);
router.post('/materials', authMiddleware, materialsController.create);
router.put('/materials/:id', authMiddleware, materialsController.update);
router.delete('/materials/:id', authMiddleware, materialsController.delete);

// ===== Units routes =====
router.get('/units', authMiddleware, unitsController.list);
router.get('/units/:id', authMiddleware, unitsController.get);
router.post('/units', authMiddleware, unitsController.create);
router.put('/units/:id', authMiddleware, unitsController.update);
router.delete('/units/:id', authMiddleware, unitsController.remove);

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

// Equipment endpoints removed — merged into materials/equipment_materials

// ===== Shipments routes =====
router.get('/shipments', authMiddleware, shipmentsController.list);
router.get('/shipments/:id', authMiddleware, shipmentsController.get);
router.post('/shipments', authMiddleware, shipmentsController.create);
router.put('/shipments/:id', authMiddleware, shipmentsController.update);
router.delete('/shipments/:id', authMiddleware, shipmentsController.delete);
router.post('/shipments/:id/files', authMiddleware, _upload.single('file'), shipmentsController.attachFile);
router.post('/shipments/:id/files/local', authMiddleware, _upload.single('file'), shipmentsController.attachLocalFile);
router.delete('/shipments/:id/files/:storage_id', authMiddleware, shipmentsController.detachFile);
router.get('/shipments/:id/files', authMiddleware, shipmentsController.listFiles);

// ===== Shipment items (materials in shipment) =====
// Removed: endpoints for managing shipment items are deprecated.

// ===== Suppliers routes =====
router.get('/suppliers', authMiddleware, suppliersController.list);
router.get('/suppliers/:id', authMiddleware, suppliersController.get);
router.post('/suppliers', authMiddleware, suppliersController.create);
router.put('/suppliers/:id', authMiddleware, suppliersController.update);
router.delete('/suppliers/:id', authMiddleware, suppliersController.delete);



// ===== Specifications routes =====
router.get('/specifications', authMiddleware, specificationsController.list);
router.get('/specifications/:id', authMiddleware, specificationsController.get);
router.post('/specifications', authMiddleware, specificationsController.create);
router.put('/specifications/:id', authMiddleware, specificationsController.update);
router.delete('/specifications/:id', authMiddleware, specificationsController.delete);

// ===== Specification versions / parts routes =====
// Specification parts
router.get('/specification_parts', authMiddleware, specificationPartsController.list);
router.get('/specification_parts/:id', authMiddleware, specificationPartsController.get);
router.post('/specification_parts', authMiddleware, specificationPartsController.create);
router.put('/specification_parts/:id', authMiddleware, specificationPartsController.update);
router.delete('/specification_parts/:id', authMiddleware, specificationPartsController.delete);

// ===== Stages routes =====
router.get('/stages', authMiddleware, stagesController.list);
router.get('/stages/:id', authMiddleware, stagesController.get);
router.post('/stages', authMiddleware, stagesController.create);
router.put('/stages/:id', authMiddleware, stagesController.update);
router.delete('/stages/:id', authMiddleware, stagesController.delete);

// ===== Storage routes =====
router.get('/storage', authMiddleware, storageController.list);
router.get('/storage/:id', authMiddleware, storageController.get);
// GET /api/storage/:id/download - download or stream the actual file
router.get('/storage/:id/download', authMiddleware, storageController.download);
// POST /api/storage/download - download multiple storage items as a ZIP
router.post('/storage/download', authMiddleware, storageController.downloadMultiple);
// POST /api/storage - (removed) create storage DB record was removed; use /storage/local or /storage/s3 instead
// POST /api/storage/local - upload file to local storage
router.post('/storage/local', authMiddleware, _upload.single('file'), storageController.uploadLocal);
// POST /api/storage/s3 - upload file(s) to S3
// Accepts multiple files under field name 'files' or a single file under 'file'
router.post('/storage/s3', authMiddleware, _upload.fields([{ name: 'files', maxCount: 50 }, { name: 'file', maxCount: 1 }]), storageController.uploadS3);
router.put('/storage/:id', authMiddleware, storageController.update);
router.delete('/storage/:id', authMiddleware, storageController.delete);

// ===== Statements routes =====
router.get('/statements', authMiddleware, statementsController.list);
router.get('/statements/:id', authMiddleware, statementsController.get);
router.post('/statements', authMiddleware, statementsController.create);
router.put('/statements/:id', authMiddleware, statementsController.update);
router.delete('/statements/:id', authMiddleware, statementsController.delete);

// ===== Statements versions / parts routes =====
router.get('/statements_versions', authMiddleware, statementsVersionController.list);
router.get('/statements_versions/:id', authMiddleware, statementsVersionController.get);
router.post('/statements_versions', authMiddleware, statementsVersionController.create);
router.put('/statements_versions/:id', authMiddleware, statementsVersionController.update);
router.delete('/statements_versions/:id', authMiddleware, statementsVersionController.delete);

router.get('/statements_parts', authMiddleware, statementsPartsController.list);
router.get('/statements_parts/:id', authMiddleware, statementsPartsController.get);
router.post('/statements_parts', authMiddleware, statementsPartsController.create);
router.put('/statements_parts/:id', authMiddleware, statementsPartsController.update);
router.delete('/statements_parts/:id', authMiddleware, statementsPartsController.delete);

// ===== Permissions routes =====
// GET /api/permissions
router.get('/permissions', authMiddleware, permissionsController.list);
// POST /api/permissions - create a new permission
router.post('/permissions', authMiddleware, permissionsController.create);
// PUT /api/permissions/:id - update permission
router.put('/permissions/:id', authMiddleware, permissionsController.update);
// DELETE /api/permissions/:id - remove permission
router.delete('/permissions/:id', authMiddleware, permissionsController.delete);

// ===== Job titles routes =====
router.get('/job_titles', authMiddleware, jobTitlesController.list);
router.post('/job_titles', authMiddleware, jobTitlesController.create);
router.put('/job_titles/:id', authMiddleware, jobTitlesController.update);
router.delete('/job_titles/:id', authMiddleware, jobTitlesController.delete);

// ===== Pages (admin) routes =====
router.get('/pages', authMiddleware, pagesController.list);
router.post('/pages', authMiddleware, pagesController.create);
router.put('/pages/:id', authMiddleware, pagesController.update);
router.delete('/pages/:id', authMiddleware, pagesController.delete);

// ===== Page permissions routes =====
router.get('/page_permissions', authMiddleware, pagePermissionsController.list);
router.post('/page_permissions', authMiddleware, pagePermissionsController.create);
router.delete('/page_permissions/:id', authMiddleware, pagePermissionsController.delete);

// ===== Audit routes =====
// GET /api/audit_logs - list audit entries (filters: actor_id, entity, entity_id, limit, offset)
router.get('/audit_logs', authMiddleware, auditLogsController.list);

// ===== Time logs routes =====
router.get('/time_logs', authMiddleware, timeLogsController.list);
// GET /api/time_logs/me - list current user's time logs (no extra permissions required)
router.get('/time_logs/me', authMiddleware, timeLogsController.listMine);
router.get('/time_logs/:id', authMiddleware, timeLogsController.get);
router.post('/time_logs', authMiddleware, timeLogsController.create);
router.put('/time_logs/:id', authMiddleware, timeLogsController.update);
router.delete('/time_logs/:id', authMiddleware, timeLogsController.delete);

// ===== Wiki routes =====
router.get('/wiki/articles', authMiddleware, wikiArticlesController.list);
router.get('/wiki/articles/:id', authMiddleware, wikiArticlesController.get);
router.post('/wiki/articles', authMiddleware, wikiArticlesController.create);
router.put('/wiki/articles/:id', authMiddleware, wikiArticlesController.update);
router.delete('/wiki/articles/:id', authMiddleware, wikiArticlesController.delete);

router.get('/wiki/sections', authMiddleware, wikiSectionsController.list);
router.get('/wiki/sections/:id', authMiddleware, wikiSectionsController.get);
router.post('/wiki/sections', authMiddleware, wikiSectionsController.create);
router.put('/wiki/sections/:id', authMiddleware, wikiSectionsController.update);
router.delete('/wiki/sections/:id', authMiddleware, wikiSectionsController.delete);

router.get('/wiki/articles/:article_id/storage', authMiddleware, wikiArticleStorageController.list);
router.get('/wiki/articles/storage/:id', authMiddleware, wikiArticleStorageController.get);
router.post('/wiki/articles/:article_id/storage', authMiddleware, wikiArticleStorageController.create);
router.delete('/wiki/articles/storage/:id', authMiddleware, wikiArticleStorageController.delete);

// Wiki favorites for current user
router.get('/wiki/favorites', authMiddleware, wikiArticleFavoritesController.listMine);
router.post('/wiki/articles/:article_id/favorite', authMiddleware, wikiArticleFavoritesController.create);
router.delete('/wiki/articles/:article_id/favorite', authMiddleware, wikiArticleFavoritesController.delete);

// Recent views
router.get('/wiki/views', authMiddleware, wikiArticleViewsController.listMine);

// ===== User pages (menu) =====
// GET /api/user/pages
router.get('/user/pages', authMiddleware, userPagesController.getPages);

module.exports = router;

