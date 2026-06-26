const User = require('../../db/models/User');
const Issue = require('../../db/models/Issue');
const Document = require('../../db/models/Document');
const CustomerQuestion = require('../../db/models/CustomerQuestion');
const EntityWatcher = require('../../db/models/EntityWatcher');
const { hasPermission, hasPermissionForProject } = require('./permissionChecker');

const ENTITY_CONFIG = {
  issue: {
    permission: 'issues',
    model: Issue,
    titleField: 'title',
    projectField: 'project_id'
  },
  document: {
    permission: 'documents',
    model: Document,
    titleField: 'title',
    projectField: 'project_id'
  },
  customer_question: {
    permission: 'customer_questions',
    model: CustomerQuestion,
    titleField: 'question_title',
    projectField: 'project_id'
  }
};

class EntityWatchersService {
  static _normalizeEntityType(entityType) {
    if (!entityType) return null;
    const normalized = String(entityType).trim().toLowerCase();
    if (normalized === 'qna') return 'customer_question';
    if (normalized === 'issues') return 'issue';
    if (normalized === 'documents') return 'document';
    if (normalized === 'customer_questions') return 'customer_question';
    return ENTITY_CONFIG[normalized] ? normalized : null;
  }

  static _buildUserRef(user) {
    if (!user) return null;
    // Rows from entity_watchers joins carry both ew.id and ew.user_id.
    // Prefer user_id so watcher payloads expose the actual user, not the watcher row id.
    const userId = typeof user.user_id !== 'undefined' && user.user_id !== null
      ? Number(user.user_id)
      : Number(user.id);
    const fullName = [user.last_name, user.first_name, user.middle_name]
      .map((part) => (part == null ? '' : String(part).trim()))
      .filter(Boolean)
      .join(' ');
    return {
      id: Number.isNaN(userId) ? null : userId,
      username: user.username || null,
      email: user.email || null,
      avatar_id: user.avatar_id || null,
      is_active: typeof user.is_active === 'undefined' ? null : !!user.is_active,
      full_name: fullName || user.username || user.email || null
    };
  }

  static async _getEntity(entityType, entityId) {
    const normalizedType = EntityWatchersService._normalizeEntityType(entityType);
    const config = normalizedType ? ENTITY_CONFIG[normalizedType] : null;
    if (!config) {
      const err = new Error('Unsupported entity type');
      err.statusCode = 400;
      throw err;
    }
    const row = await config.model.findById(Number(entityId));
    if (!row || row.is_active === false) {
      const err = new Error(`${normalizedType} not found`);
      err.statusCode = 404;
      throw err;
    }
    return row;
  }

  static async _assertAccess(entityType, entityId, actor, requiredPermission) {
    const normalizedType = EntityWatchersService._normalizeEntityType(entityType);
    const config = normalizedType ? ENTITY_CONFIG[normalizedType] : null;
    if (!config) {
      const err = new Error('Unsupported entity type');
      err.statusCode = 400;
      throw err;
    }

    const entity = await EntityWatchersService._getEntity(normalizedType, entityId);
    const projectId = entity && entity[config.projectField] ? Number(entity[config.projectField]) : null;

    const perm = `${config.permission}.${requiredPermission}`;
    const allowed = projectId
      ? await hasPermissionForProject(actor, perm, projectId)
      : await hasPermission(actor, perm);

    if (!allowed) {
      const err = new Error(`Forbidden: missing permission ${perm}`);
      err.statusCode = 403;
      throw err;
    }

    return entity;
  }

  static async listWatchers(entityType, entityId, actor) {
    const normalizedType = EntityWatchersService._normalizeEntityType(entityType);
    if (!normalizedType) {
      const err = new Error('Unsupported entity type');
      err.statusCode = 400;
      throw err;
    }

    await EntityWatchersService._assertAccess(normalizedType, entityId, actor, 'view');

    const rows = await EntityWatcher.listByEntity(normalizedType, Number(entityId));
    return rows.map((row) => ({
      id: row.id,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      created_by: row.created_by,
      created_at: row.created_at,
      user: EntityWatchersService._buildUserRef(row)
    }));
  }

  static async addWatcher(entityType, entityId, watcherUserId, actor) {
    const normalizedType = EntityWatchersService._normalizeEntityType(entityType);
    if (!normalizedType) {
      const err = new Error('Unsupported entity type');
      err.statusCode = 400;
      throw err;
    }

    await EntityWatchersService._assertAccess(normalizedType, entityId, actor, 'watchers.create');

    const inputIds = Array.isArray(watcherUserId)
      ? watcherUserId
      : (typeof watcherUserId === 'string' && watcherUserId.includes(','))
        ? watcherUserId.split(',')
        : [watcherUserId];

    const userIds = [...new Set(
      inputIds
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0)
    )];

    if (userIds.length === 0) {
      const err = new Error('Invalid user_id');
      err.statusCode = 400;
      throw err;
    }

    const createdRows = [];
    for (const userId of userIds) {
      const user = await User.findById(userId);
      if (!user || user.is_active === false) {
        if (userIds.length === 1) {
          const err = new Error('User not found');
          err.statusCode = 404;
          throw err;
        }
        createdRows.push({
          user_id: userId,
          ok: false,
          error: 'User not found'
        });
        continue;
      }

      const created = await EntityWatcher.create({
        entity_type: normalizedType,
        entity_id: Number(entityId),
        user_id: userId,
        created_by: actor && actor.id ? Number(actor.id) : null
      });

      const watcher = {
        id: created.id,
        entity_type: created.entity_type,
        entity_id: created.entity_id,
        created_by: created.created_by,
        created_at: created.created_at,
        user: EntityWatchersService._buildUserRef(user)
      };

      if (userIds.length === 1) {
        createdRows.push(watcher);
      } else {
        createdRows.push({
          user_id: userId,
          ok: true,
          watcher
        });
      }
    }

    return userIds.length === 1 ? createdRows[0] : createdRows;
  }

  static async addSelfWatcher(entityType, entityId, actor) {
    if (!actor || !actor.id) {
      const err = new Error('Authentication required');
      err.statusCode = 401;
      throw err;
    }

    const normalizedType = EntityWatchersService._normalizeEntityType(entityType);
    if (!normalizedType) {
      const err = new Error('Unsupported entity type');
      err.statusCode = 400;
      throw err;
    }

    await EntityWatchersService._assertAccess(normalizedType, entityId, actor, 'view');

    const user = await User.findById(Number(actor.id));
    if (!user || user.is_active === false) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }

    const created = await EntityWatcher.create({
      entity_type: normalizedType,
      entity_id: Number(entityId),
      user_id: Number(actor.id),
      created_by: Number(actor.id)
    });

    return {
      id: created.id,
      entity_type: created.entity_type,
      entity_id: created.entity_id,
      created_by: created.created_by,
      created_at: created.created_at,
      user: EntityWatchersService._buildUserRef(user)
    };
  }

  static async removeWatcher(entityType, entityId, watcherUserId, actor) {
    const normalizedType = EntityWatchersService._normalizeEntityType(entityType);
    if (!normalizedType) {
      const err = new Error('Unsupported entity type');
      err.statusCode = 400;
      throw err;
    }

    await EntityWatchersService._assertAccess(normalizedType, entityId, actor, 'watchers.delete');

    const userId = Number(watcherUserId);
    if (!userId || Number.isNaN(userId)) {
      const err = new Error('Invalid user_id');
      err.statusCode = 400;
      throw err;
    }

    const removed = await EntityWatcher.remove(normalizedType, Number(entityId), userId);
    if (!removed) {
      const err = new Error('Watcher not found');
      err.statusCode = 404;
      throw err;
    }
    return { success: true };
  }

  static async removeSelfWatcher(entityType, entityId, actor) {
    if (!actor || !actor.id) {
      const err = new Error('Authentication required');
      err.statusCode = 401;
      throw err;
    }

    const normalizedType = EntityWatchersService._normalizeEntityType(entityType);
    if (!normalizedType) {
      const err = new Error('Unsupported entity type');
      err.statusCode = 400;
      throw err;
    }

    await EntityWatchersService._assertAccess(normalizedType, entityId, actor, 'view');

    const removed = await EntityWatcher.remove(normalizedType, Number(entityId), Number(actor.id));
    if (!removed) {
      const err = new Error('Watcher not found');
      err.statusCode = 404;
      throw err;
    }
    return { success: true };
  }

  static async getWatcherIds(entityType, entityId) {
    const normalizedType = EntityWatchersService._normalizeEntityType(entityType);
    if (!normalizedType) return [];
    return EntityWatcher.listUserIdsByEntity(normalizedType, Number(entityId));
  }

  static async getWatcherMap(entityType, entityId) {
    const rows = await EntityWatcher.listByEntity(entityType, Number(entityId));
    return {
      rows,
      userIds: rows.map((row) => Number(row.user_id)).filter((id) => !Number.isNaN(id))
    };
  }
}

module.exports = EntityWatchersService;
