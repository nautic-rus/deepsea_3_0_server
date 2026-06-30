const crypto = require('crypto');
const pool = require('../db');
const config = require('../config');
const ChatBroadcaster = require('./chatBroadcaster');

function buildError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function buildRoomId() {
  return `!${crypto.randomUUID()}:${config.serviceName}`;
}

function buildEventId() {
  return `$${crypto.randomUUID()}:${config.serviceName}`;
}

function normalizeLimit(value, fallback = 50, max = 200) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function parseBoolean(value, fallback = false) {
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return fallback;
}

function pickLogin(user, fallbackId) {
  if (!user) return `user-${fallbackId}`;
  const login = String(user.username || user.email || '').trim();
  return login || `user-${fallbackId}`;
}

function pickDisplayName(user, fallbackId) {
  if (!user) return `user-${fallbackId}`;
  const parts = [user.last_name, user.first_name, user.middle_name]
    .map((part) => String(part || '').trim())
    .filter(Boolean);
  if (parts.length) return parts.join(' ');
  const fullName = String(user.full_name || '').trim();
  if (fullName) return fullName;
  return pickLogin(user, fallbackId);
}

function formatSenderDisplay(user, fallbackId) {
  const login = pickLogin(user, fallbackId);
  const fullName = pickDisplayName(user, fallbackId);
  return {
    sender_login: login,
    sender_full_name: fullName,
    sender_display_name: fullName === login ? login : `${fullName} (${login})`
  };
}

const ROOM_ROLES = ['owner', 'admin', 'member'];
const SYSTEM_ROLES = ['admin', 'user'];

class ChatService {
  static async openStream(actor, res) {
    await this._assertAuthenticated(actor);

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    res.write('retry: 5000\n\n');
    ChatBroadcaster.register(actor.id, res);

    return { connected: true, user_id: Number(actor.id) };
  }

  static async ensureSchema() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_room_user_settings (
        room_id varchar(255) NOT NULL REFERENCES chat_rooms(room_id) ON DELETE CASCADE,
        user_id integer NOT NULL,
        is_hidden boolean NOT NULL DEFAULT false,
        is_favorite boolean NOT NULL DEFAULT false,
        created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (room_id, user_id)
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_chat_room_user_settings_user_id
      ON chat_room_user_settings (user_id)
    `);
  }

  static async createRoom(payload = {}, actor, requestHeaders = {}) {
    const memberIds = [...new Set([actor.id, ...(Array.isArray(payload.member_user_ids) ? payload.member_user_ids : [])].map(Number).filter(Boolean))];
    const name = payload.name ? String(payload.name).trim() : null;
    const topic = payload.topic ? String(payload.topic).trim() : null;
    const visibility = payload.visibility === 'public' ? 'public' : 'private';
    const isDirect = Boolean(payload.is_direct);
    const roomId = buildRoomId();

    if (isDirect && memberIds.length === 2) {
      const existingDirectRoom = await this._findDirectRoom(memberIds);
      if (existingDirectRoom) {
        return this.getRoom(existingDirectRoom, actor, requestHeaders);
      }
    }

    const directRoomName = isDirect ? await this._buildDirectRoomName(memberIds, actor, requestHeaders) : null;
    const roomName = isDirect ? directRoomName.canonical_name : name;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO chat_rooms (room_id, name, topic, visibility, is_direct, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [roomId, roomName, topic, visibility, isDirect, actor.id]
      );

      await client.query(
        `INSERT INTO chat_room_members (room_id, user_id, membership, member_role, invited_by, joined_at)
         VALUES ($1, $2, 'join', 'owner', $2, CURRENT_TIMESTAMP)`,
        [roomId, actor.id]
      );

      await this._insertEvent(client, {
        roomId,
        senderId: actor.id,
        eventType: 'm.room.create',
        stateKey: '',
        content: { creator: actor.id, is_direct: isDirect, visibility }
      });

      if (roomName) {
        await this._insertEvent(client, {
          roomId,
          senderId: actor.id,
          eventType: 'm.room.name',
          stateKey: '',
          content: { name: roomName }
        });
      }

      if (topic) {
        await this._insertEvent(client, {
          roomId,
          senderId: actor.id,
          eventType: 'm.room.topic',
          stateKey: '',
          content: { topic }
        });
      }

      await this._insertEvent(client, {
        roomId,
        senderId: actor.id,
        eventType: 'm.room.member',
        stateKey: String(actor.id),
        content: { membership: 'join', role: 'owner', user_id: actor.id }
      });

      for (const userId of memberIds) {
        if (userId === actor.id) continue;
        await client.query(
          `INSERT INTO chat_room_members (room_id, user_id, membership, member_role, invited_by)
           VALUES ($1, $2, 'invite', 'member', $3)
           ON CONFLICT (room_id, user_id)
           DO UPDATE SET membership = EXCLUDED.membership, member_role = COALESCE(chat_room_members.member_role, 'member'), invited_by = EXCLUDED.invited_by, updated_at = CURRENT_TIMESTAMP`,
          [roomId, userId, actor.id]
        );

        await this._insertEvent(client, {
          roomId,
          senderId: actor.id,
          eventType: 'm.room.member',
          stateKey: String(userId),
          content: { membership: 'invite', role: 'member', user_id: userId, invited_by: actor.id }
        });
      }

      await client.query('COMMIT');
      await this._notifyRoomMembers(roomId, 'room_created', {
        room_id: roomId,
        actor_id: actor.id,
        is_direct: isDirect
      });
      return this.getRoom(roomId, actor, requestHeaders);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async listRooms(actor, requestHeaders = {}, query = {}) {
    const systemRole = await this._getSystemRole(actor.id);
    const includeHidden = parseBoolean(query.include_hidden || query.includeHidden, false);
    const result = await pool.query(
      `SELECT
         r.room_id,
         r.name,
         r.topic,
         r.visibility,
         r.is_direct,
         r.created_by,
         r.created_at,
         r.updated_at,
         vm.membership,
         vm.member_role,
         vm.last_read_event_id,
         COALESCE(s.is_hidden, false) AS is_hidden,
         COALESCE(s.is_favorite, false) AS is_favorite,
         COALESCE(unread.unread_count, 0)::int AS unread_count,
         COALESCE(unread.unread_count, 0) > 0 AS has_unread,
         rm.member_ids,
         last_event.event_id AS last_event_id,
         last_event.event_type AS last_event_type,
         last_event.content AS last_event_content,
         last_event.created_at AS last_event_at
       FROM chat_rooms r
       LEFT JOIN LATERAL (
         SELECT m.membership, m.member_role, m.last_read_event_id
         FROM chat_room_members m
         WHERE m.room_id = r.room_id
           AND m.user_id = $1
         LIMIT 1
       ) AS vm ON TRUE
       LEFT JOIN LATERAL (
         SELECT
           ARRAY_AGG(DISTINCT m2.user_id ORDER BY m2.user_id) AS member_ids,
           JSONB_AGG(
             JSONB_BUILD_OBJECT(
               'user_id', m2.user_id,
               'membership', m2.membership,
               'member_role', m2.member_role
             )
             ORDER BY m2.user_id
           ) AS members
         FROM chat_room_members m2
         WHERE m2.room_id = r.room_id
           AND m2.membership IN ('join', 'invite')
       ) AS rm ON TRUE
       LEFT JOIN chat_room_user_settings s ON s.room_id = r.room_id AND s.user_id = $1
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS unread_count
         FROM chat_events e
         WHERE e.room_id = r.room_id
           AND e.event_type = 'm.room.message'
           AND e.id > COALESCE((
             SELECT e2.id
             FROM chat_events e2
             WHERE e2.event_id = vm.last_read_event_id
             LIMIT 1
           ), 0)
       ) AS unread ON TRUE
       LEFT JOIN LATERAL (
         SELECT e.event_id, e.event_type, e.content, e.created_at
         FROM chat_events e
         WHERE e.room_id = r.room_id
         ORDER BY e.id DESC
         LIMIT 1
       ) AS last_event ON TRUE
       WHERE ($2 = 'admin' OR vm.membership IS NOT NULL)
       ${includeHidden ? '' : 'AND COALESCE(s.is_hidden, false) = false'}
       ORDER BY COALESCE(s.is_favorite, false) DESC, COALESCE(last_event.created_at, r.created_at) DESC`,
      [actor.id, systemRole]
    );

    const decoratedRooms = await this._decorateRooms(result.rows, actor, requestHeaders, { listMode: true });
    return this._attachRoomMembers(decoratedRooms, requestHeaders);
  }

  static async getRoom(roomId, actor, requestHeaders = {}) {
    await this._assertRoomVisible(roomId, actor.id);

    const roomResult = await pool.query(
      `SELECT room_id, name, topic, visibility, is_direct, created_by, created_at, updated_at
       FROM chat_rooms
       WHERE room_id = $1`,
      [roomId]
    );

    const room = roomResult.rows[0];
    if (!room) throw buildError('Room not found', 404);

    const settings = await this._getRoomSettings(roomId, actor.id);
    const members = await this.listMembers(roomId, actor);
    const [decoratedRoom] = await this._decorateRooms(
      [{ ...room, ...settings, member_ids: members.map((member) => Number(member.user_id)).filter(Boolean) }],
      actor,
      requestHeaders,
      { listMode: false }
    );
    return { ...decoratedRoom, members };
  }

  static async listMembers(roomId, actor) {
    await this._assertRoomVisible(roomId, actor.id);
    const result = await pool.query(
      `SELECT room_id, user_id, membership, invited_by, joined_at, left_at, last_read_event_id, created_at, updated_at
       , member_role
       FROM chat_room_members
       WHERE room_id = $1
       ORDER BY user_id`,
      [roomId]
    );
    return result.rows;
  }

  static async invite(roomId, userId, actor) {
    await this._assertCanInvite(roomId, actor.id);
    const normalizedUserId = Number(userId);
    if (!normalizedUserId) throw buildError('user_id is required', 400);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO chat_room_members (room_id, user_id, membership, member_role, invited_by)
         VALUES ($1, $2, 'invite', 'member', $3)
         ON CONFLICT (room_id, user_id)
         DO UPDATE SET membership = 'invite', invited_by = EXCLUDED.invited_by, left_at = NULL, updated_at = CURRENT_TIMESTAMP`,
        [roomId, normalizedUserId, actor.id]
      );

      const event = await this._insertEvent(client, {
        roomId,
        senderId: actor.id,
        eventType: 'm.room.member',
        stateKey: String(normalizedUserId),
        content: { membership: 'invite', role: 'member', user_id: normalizedUserId, invited_by: actor.id }
      });

      await client.query('COMMIT');
      await this._notifyRoomMembers(roomId, 'member_invited', {
        room_id: roomId,
        actor_id: actor.id,
        target_user_id: normalizedUserId
      });
      return event;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async join(roomId, actor) {
    const roomResult = await pool.query('SELECT room_id, visibility FROM chat_rooms WHERE room_id = $1', [roomId]);
    const room = roomResult.rows[0];
    if (!room) throw buildError('Room not found', 404);

    const membership = await this._getMembership(roomId, actor.id);
    if (room.visibility !== 'public' && membership !== 'invite' && membership !== 'join') {
      throw buildError('Invite required', 403);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO chat_room_members (room_id, user_id, membership, member_role, invited_by, joined_at, left_at)
         VALUES ($1, $2, 'join', 'member', $2, CURRENT_TIMESTAMP, NULL)
         ON CONFLICT (room_id, user_id)
         DO UPDATE SET membership = 'join', joined_at = CURRENT_TIMESTAMP, left_at = NULL, updated_at = CURRENT_TIMESTAMP`,
        [roomId, actor.id]
      );

      const event = await this._insertEvent(client, {
        roomId,
        senderId: actor.id,
        eventType: 'm.room.member',
        stateKey: String(actor.id),
        content: { membership: 'join', role: 'member', user_id: actor.id }
      });

      await client.query('COMMIT');
      await this._notifyRoomMembers(roomId, 'member_joined', {
        room_id: roomId,
        actor_id: actor.id,
        user_id: actor.id
      });
      return event;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async leave(roomId, actor) {
    await this._assertJoined(roomId, actor.id);
    await this._assertCanLeave(roomId, actor.id);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE chat_room_members
         SET membership = 'leave', left_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE room_id = $1 AND user_id = $2`,
        [roomId, actor.id]
      );

      const event = await this._insertEvent(client, {
        roomId,
        senderId: actor.id,
        eventType: 'm.room.member',
        stateKey: String(actor.id),
        content: { membership: 'leave', user_id: actor.id }
      });

      await client.query(
        `DELETE FROM chat_room_user_settings
         WHERE room_id = $1 AND user_id = $2`,
        [roomId, actor.id]
      );

      await client.query('COMMIT');
      await this._notifyRoomMembers(roomId, 'member_left', {
        room_id: roomId,
        actor_id: actor.id,
        user_id: actor.id
      });
      ChatBroadcaster.sendToUser(actor.id, 'chat.update', {
        kind: 'member_left',
        room_id: roomId,
        actor_id: actor.id,
        user_id: actor.id
      });
      return event;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateMemberRole(roomId, userId, role, actor) {
    const normalizedUserId = Number(userId);
    const normalizedRole = String(role || '').trim();
    if (!normalizedUserId) throw buildError('user_id is required', 400);
    if (!ROOM_ROLES.includes(normalizedRole)) throw buildError('Invalid role', 400);

    const actorMember = await this._assertCanManageRoles(roomId, actor.id);
    const targetMember = await this._getMember(roomId, normalizedUserId);
    if (!targetMember || targetMember.membership === 'leave') throw buildError('Member not found', 404);

    const isSystemAdmin = actorMember.system_role === 'admin';

    if (!isSystemAdmin && actorMember.member_role !== 'owner' && normalizedRole !== 'member') {
      throw buildError('Only owner can assign admin or owner', 403);
    }
    if (!isSystemAdmin && actorMember.member_role !== 'owner' && targetMember.member_role !== 'member') {
      throw buildError('Only owner can change admin or owner role', 403);
    }
    if (!isSystemAdmin && targetMember.member_role === 'owner' && normalizedRole !== 'owner' && Number(actor.id) !== normalizedUserId) {
      throw buildError('Only owner can change another owner role', 403);
    }
    if (targetMember.member_role === 'owner' && normalizedRole !== 'owner') {
      await this._assertNotLastOwner(roomId, normalizedUserId);
    }

    await pool.query(
      `UPDATE chat_room_members
       SET member_role = $3, updated_at = CURRENT_TIMESTAMP
       WHERE room_id = $1 AND user_id = $2`,
      [roomId, normalizedUserId, normalizedRole]
    );

    const event = await this._insertEvent(pool, {
      roomId,
      senderId: actor.id,
      eventType: 'm.room.member.role',
      stateKey: String(normalizedUserId),
      content: {
        user_id: normalizedUserId,
        role: normalizedRole,
        changed_by: actor.id
      }
    });

    await this._notifyRoomMembers(roomId, 'member_role_updated', {
      room_id: roomId,
      actor_id: actor.id,
      target_user_id: normalizedUserId,
      role: normalizedRole,
      event_id: event.event_id,
      stream_id: event.id
    });

    return event;
  }

  static async kickMember(roomId, userId, actor) {
    const normalizedUserId = Number(userId);
    if (!normalizedUserId) throw buildError('user_id is required', 400);
    if (Number(actor.id) === normalizedUserId) throw buildError('Use leave for self removal', 400);

    const actorMember = await this._assertCanKick(roomId, actor.id);
    const targetMember = await this._getMember(roomId, normalizedUserId);
    if (!targetMember || targetMember.membership === 'leave') throw buildError('Member not found', 404);
    const isSystemAdmin = actorMember.system_role === 'admin';
    if (!isSystemAdmin && targetMember.member_role === 'owner') throw buildError('Owner cannot be kicked', 403);
    if (!isSystemAdmin && actorMember.member_role !== 'owner' && targetMember.member_role === 'admin') {
      throw buildError('Only owner can kick admin', 403);
    }

    await pool.query(
      `UPDATE chat_room_members
       SET membership = 'leave', left_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE room_id = $1 AND user_id = $2`,
      [roomId, normalizedUserId]
    );

    const event = await this._insertEvent(pool, {
      roomId,
      senderId: actor.id,
      eventType: 'm.room.member',
      stateKey: String(normalizedUserId),
      content: {
        membership: 'leave',
        user_id: normalizedUserId,
        kicked_by: actor.id
      }
    });

    await this._notifyRoomMembers(roomId, 'member_kicked', {
      room_id: roomId,
      actor_id: actor.id,
      target_user_id: normalizedUserId,
      event_id: event.event_id,
      stream_id: event.id
    });
    ChatBroadcaster.sendToUser(normalizedUserId, 'chat.update', {
      kind: 'member_kicked',
      room_id: roomId,
      actor_id: actor.id,
      target_user_id: normalizedUserId,
      event_id: event.event_id,
      stream_id: event.id
    });

    return event;
  }

  static async deleteRoom(roomId, actor) {
    if (!(await this._isSystemAdmin(actor.id))) {
      const actorMember = await this._getMember(roomId, actor.id);
      if (!actorMember || actorMember.membership !== 'join') throw buildError('Forbidden', 403);
      if (actorMember.member_role !== 'owner') throw buildError('Only owner can delete room', 403);
    }

    const recipientIds = await this._getRoomRecipientIds(roomId);
    const result = await pool.query(
      `DELETE FROM chat_rooms
       WHERE room_id = $1
       RETURNING room_id`,
      [roomId]
    );
    if (!result.rows[0]) throw buildError('Room not found', 404);
    ChatBroadcaster.sendToUsers(recipientIds, 'chat.update', {
      kind: 'room_deleted',
      room_id: roomId,
      actor_id: actor.id
    });
    return { deleted: true, room_id: roomId };
  }

  static async sendMessage(roomId, payload = {}, actor) {
    await this._assertJoined(roomId, actor.id);
    const body = payload.body ? String(payload.body).trim() : '';
    if (!body) throw buildError('body is required', 400);

    const event = await this._insertEvent(pool, {
      roomId,
      senderId: actor.id,
      eventType: 'm.room.message',
      content: {
        msgtype: payload.msgtype ? String(payload.msgtype) : 'm.text',
        body
      },
      relatesTo: payload.relates_to || null
    });

    await this._notifyRoomMembers(roomId, 'message_created', {
      room_id: roomId,
      actor_id: actor.id,
      event_id: event.event_id,
      stream_id: event.id,
      event_type: event.event_type
    });

    return event;
  }

  static async sendFiles(roomId, payload = {}, actor) {
    await this._assertJoined(roomId, actor.id);
    const files = Array.isArray(payload.files) ? payload.files : [];
    if (files.length === 0) throw buildError('files are required', 400);

    const normalizedFiles = files.map((file) => {
      const storageId = Number(file.storage_id);
      const fileName = file.file_name ? String(file.file_name).trim() : '';
      if (!storageId || !fileName) {
        throw buildError('Each file must include storage_id and file_name', 400);
      }
      return {
        storage_id: storageId,
        file_name: fileName,
        file_size: file.file_size != null ? Number(file.file_size) : null,
        mime_type: file.mime_type ? String(file.mime_type) : null,
        url: file.url ? String(file.url) : null,
        bucket_name: file.bucket_name ? String(file.bucket_name) : null,
        object_key: file.object_key ? String(file.object_key) : null
      };
    });

    const event = await this._insertEvent(pool, {
      roomId,
      senderId: actor.id,
      eventType: 'm.room.message',
      content: {
        msgtype: 'm.file',
        body: payload.body ? String(payload.body).trim() : normalizedFiles.map((file) => file.file_name).join(', '),
        attachments: normalizedFiles
      }
    });

    await this._notifyRoomMembers(roomId, 'message_created', {
      room_id: roomId,
      actor_id: actor.id,
      event_id: event.event_id,
      stream_id: event.id,
      event_type: event.event_type
    });

    return event;
  }

  static async listMessages(roomId, query = {}, actor, requestHeaders = {}) {
    await this._assertRoomVisible(roomId, actor.id);
    const limit = normalizeLimit(query.limit);
    const params = [roomId];
    const filters = [];

    if (query.before) {
      params.push(Number(query.before));
      filters.push(`e.id < $${params.length}`);
    }

    if (query.after) {
      params.push(Number(query.after));
      filters.push(`e.id > $${params.length}`);
    }

    params.push(limit);

    const result = await pool.query(
      `SELECT e.id, e.event_id, e.room_id, e.sender_id, e.event_type, e.state_key, e.content, e.relates_to, e.origin_server_ts, e.created_at
       FROM chat_events e
       WHERE e.room_id = $1
       AND e.event_type = 'm.room.message'
       ${filters.length ? `AND ${filters.join(' AND ')}` : ''}
       ORDER BY e.id ASC
       LIMIT $${params.length}`,
      params
    );

    return this._buildTimeline(result.rows, actor.id, requestHeaders);
  }

  static async addReaction(roomId, eventId, payload = {}, actor) {
    await this._assertJoined(roomId, actor.id);
    const key = payload.key ? String(payload.key).trim() : '';
    if (!key) throw buildError('key is required', 400);

    const target = await this._getRoomEvent(roomId, eventId);
    if (target.event_type !== 'm.room.message') throw buildError('Reactions are supported only for message events', 400);

    const existing = await pool.query(
      `SELECT id
       FROM chat_events
       WHERE room_id = $1
         AND sender_id = $2
         AND relation_event_id = $3
         AND relation_type = 'm.annotation'
         AND reaction_key = $4
       LIMIT 1`,
      [roomId, actor.id, eventId, key]
    );
    if (existing.rows[0]) {
      return { already_exists: true, event_id: eventId, key };
    }

    const event = await this._insertEvent(pool, {
      roomId,
      senderId: actor.id,
      eventType: 'm.reaction',
      relationEventId: eventId,
      relationType: 'm.annotation',
      reactionKey: key,
      content: {
        'm.relates_to': {
          event_id: eventId,
          rel_type: 'm.annotation',
          key
        }
      }
    });

    await this._notifyRoomMembers(roomId, 'reaction_added', {
      room_id: roomId,
      actor_id: actor.id,
      target_event_id: eventId,
      reaction_key: key,
      event_id: event.event_id,
      stream_id: event.id
    });

    return event;
  }

  static async removeReaction(roomId, eventId, key, actor) {
    await this._assertJoined(roomId, actor.id);
    const normalizedKey = key ? String(key).trim() : '';
    if (!normalizedKey) throw buildError('key is required', 400);

    const deleted = await pool.query(
      `DELETE FROM chat_events
       WHERE room_id = $1
         AND sender_id = $2
         AND relation_event_id = $3
         AND relation_type = 'm.annotation'
         AND reaction_key = $4
       RETURNING id, event_id`,
      [roomId, actor.id, eventId, normalizedKey]
    );

    if (deleted.rowCount > 0) {
      await this._notifyRoomMembers(roomId, 'reaction_removed', {
        room_id: roomId,
        actor_id: actor.id,
        target_event_id: eventId,
        reaction_key: normalizedKey
      });
    }

    return {
      deleted: deleted.rowCount > 0,
      key: normalizedKey,
      event_id: eventId
    };
  }

  static async editMessage(roomId, eventId, payload = {}, actor) {
    await this._assertJoined(roomId, actor.id);
    const originalEvent = await this._getOwnEditableMessage(roomId, eventId, actor.id);
    if (originalEvent.content && originalEvent.content.deleted) throw buildError('Deleted message cannot be edited', 400);

    const body = payload.body ? String(payload.body).trim() : '';
    if (!body) throw buildError('body is required', 400);

    const event = await this._insertEvent(pool, {
      roomId,
      senderId: actor.id,
      eventType: 'm.room.message.edit',
      relationEventId: eventId,
      relationType: 'm.replace',
      content: {
        body,
        msgtype: payload.msgtype ? String(payload.msgtype) : (originalEvent.content && originalEvent.content.msgtype) || 'm.text',
        'm.new_content': {
          body,
          msgtype: payload.msgtype ? String(payload.msgtype) : (originalEvent.content && originalEvent.content.msgtype) || 'm.text'
        }
      }
    });

    await this._notifyRoomMembers(roomId, 'message_edited', {
      room_id: roomId,
      actor_id: actor.id,
      target_event_id: eventId,
      event_id: event.event_id,
      stream_id: event.id
    });

    return event;
  }

  static async deleteMessage(roomId, eventId, actor) {
    await this._assertJoined(roomId, actor.id);
    await this._getOwnEditableMessage(roomId, eventId, actor.id);

    const event = await this._insertEvent(pool, {
      roomId,
      senderId: actor.id,
      eventType: 'm.room.redaction',
      relationEventId: eventId,
      relationType: 'm.redaction',
      content: {
        redacts: eventId
      }
    });

    await this._notifyRoomMembers(roomId, 'message_deleted', {
      room_id: roomId,
      actor_id: actor.id,
      target_event_id: eventId,
      event_id: event.event_id,
      stream_id: event.id
    });

    return event;
  }

  static async setReadMarker(roomId, eventId, actor) {
    await this._assertRoomVisible(roomId, actor.id);
    if (!eventId) throw buildError('event_id is required', 400);

    await pool.query(
      `UPDATE chat_room_members
       SET last_read_event_id = $3, updated_at = CURRENT_TIMESTAMP
       WHERE room_id = $1 AND user_id = $2`,
      [roomId, actor.id, String(eventId)]
    );

    ChatBroadcaster.sendToUser(actor.id, 'chat.update', {
      kind: 'read_marker_updated',
      room_id: roomId,
      user_id: actor.id,
      event_id: String(eventId)
    });

    return { room_id: roomId, user_id: actor.id, event_id: String(eventId) };
  }

  static async markAllRead(actor) {
    await this._assertAuthenticated(actor);

    const result = await pool.query(
      `WITH my_rooms AS (
         SELECT room_id
         FROM chat_room_members
         WHERE user_id = $1
           AND membership IN ('join', 'invite')
       ),
       latest_messages AS (
         SELECT DISTINCT ON (r.room_id)
           r.room_id,
           e.event_id AS latest_event_id
         FROM my_rooms r
         LEFT JOIN chat_events e
           ON e.room_id = r.room_id
          AND e.event_type = 'm.room.message'
         ORDER BY r.room_id, e.id DESC
       ),
       updated AS (
         UPDATE chat_room_members m
         SET last_read_event_id = lm.latest_event_id,
             updated_at = CURRENT_TIMESTAMP
         FROM latest_messages lm
         WHERE m.room_id = lm.room_id
           AND m.user_id = $1
           AND lm.latest_event_id IS NOT NULL
         RETURNING m.room_id, m.last_read_event_id
       )
       SELECT
         COALESCE((SELECT COUNT(*)::int FROM updated), 0) AS updated_count,
         COALESCE((SELECT JSON_AGG(JSON_BUILD_OBJECT('room_id', room_id, 'event_id', last_read_event_id)) FROM updated), '[]'::json) AS rooms`,
      [actor.id]
    );

    const row = result.rows[0] || { updated_count: 0, rooms: [] };
    ChatBroadcaster.sendToUser(actor.id, 'chat.update', {
      kind: 'all_read',
      user_id: actor.id,
      updated_count: Number(row.updated_count) || 0,
      rooms: row.rooms || []
    });

    return {
      updated_count: Number(row.updated_count) || 0,
      rooms: row.rooms || []
    };
  }

  static async updateRoomPreferences(roomId, payload = {}, actor) {
    await this._assertRoomVisible(roomId, actor.id);
    const hasHidden = Object.prototype.hasOwnProperty.call(payload, 'is_hidden');
    const hasFavorite = Object.prototype.hasOwnProperty.call(payload, 'is_favorite');
    if (!hasHidden && !hasFavorite) {
      throw buildError('is_hidden or is_favorite is required', 400);
    }

    const current = await this._getRoomSettings(roomId, actor.id);
    const nextHidden = hasHidden ? parseBoolean(payload.is_hidden, current.is_hidden) : current.is_hidden;
    const nextFavorite = hasFavorite ? parseBoolean(payload.is_favorite, current.is_favorite) : current.is_favorite;

    const result = await pool.query(
      `INSERT INTO chat_room_user_settings (room_id, user_id, is_hidden, is_favorite)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (room_id, user_id)
       DO UPDATE SET is_hidden = EXCLUDED.is_hidden, is_favorite = EXCLUDED.is_favorite, updated_at = CURRENT_TIMESTAMP
       RETURNING room_id, user_id, is_hidden, is_favorite, created_at, updated_at`,
      [roomId, actor.id, nextHidden, nextFavorite]
    );

    ChatBroadcaster.sendToUser(actor.id, 'chat.update', {
      kind: 'room_preferences_updated',
      room_id: roomId,
      user_id: actor.id,
      is_hidden: result.rows[0].is_hidden,
      is_favorite: result.rows[0].is_favorite
    });

    return result.rows[0];
  }

  static async sync(query = {}, actor, requestHeaders = {}) {
    await this._assertAuthenticated(actor);
    const since = Number(query.since) || 0;
    const limit = normalizeLimit(query.limit, 100, 500);

    const roomsResult = await pool.query(
      `SELECT room_id, membership
       FROM chat_room_members
       WHERE user_id = $1 AND membership IN ('join', 'invite')`,
      [actor.id]
    );

    const roomIds = roomsResult.rows.map((row) => row.room_id);
    if (roomIds.length === 0) {
      return { since, next_batch: since, rooms: [] };
    }

    const eventsResult = await pool.query(
      `SELECT e.id, e.event_id, e.room_id, e.sender_id, e.event_type, e.state_key, e.content, e.relates_to, e.origin_server_ts, e.created_at
       FROM chat_events e
       WHERE e.room_id = ANY($1::varchar[]) AND e.id > $2
       ORDER BY e.id ASC
       LIMIT $3`,
      [roomIds, since, limit]
    );

    const membershipMap = new Map(roomsResult.rows.map((row) => [row.room_id, row.membership]));
    const grouped = new Map();
    let nextBatch = since;

    for (const event of eventsResult.rows) {
      nextBatch = Math.max(nextBatch, Number(event.id));
      if (!grouped.has(event.room_id)) {
        grouped.set(event.room_id, []);
      }
      grouped.get(event.room_id).push(event);
    }

    const hydratedRooms = await Promise.all(
      Array.from(grouped.entries()).map(async ([roomId, events]) => ({
        room_id: roomId,
        membership: membershipMap.get(roomId) || null,
        timeline: await this._hydrateSyncTimeline(roomId, events, actor.id, requestHeaders)
      }))
    );

    return {
      since,
      next_batch: nextBatch,
      rooms: hydratedRooms
    };
  }

  static async listSystemRoles(actor) {
    await this._assertSystemAdmin(actor.id);
    const result = await pool.query(
      `SELECT user_id, role, assigned_by, created_at, updated_at
       FROM chat_user_roles
       ORDER BY user_id ASC`
    );
    const envAdmins = config.adminUserIds
      .filter((userId) => !result.rows.some((row) => Number(row.user_id) === Number(userId)))
      .map((userId) => ({
        user_id: userId,
        role: 'admin',
        assigned_by: null,
        created_at: null,
        updated_at: null,
        source: 'env'
      }));
    return [...envAdmins, ...result.rows.map((row) => ({ ...row, source: 'db' }))];
  }

  static async getSystemRoleForUser(userId, actor) {
    await this._assertSystemAdmin(actor.id);
    if (!userId) throw buildError('Invalid user id', 400);
    return this._getSystemRoleEntry(userId);
  }

  static async setSystemRole(userId, payload = {}, actor) {
    await this._assertSystemAdmin(actor.id);
    if (!userId) throw buildError('Invalid user id', 400);
    const role = String(payload.role || '').trim();
    if (!SYSTEM_ROLES.includes(role)) throw buildError('Invalid system role', 400);

    if (config.adminUserIds.includes(Number(userId)) && role !== 'admin') {
      throw buildError('Env admin role cannot be downgraded via API', 400);
    }

    if (role === 'user') {
      await pool.query('DELETE FROM chat_user_roles WHERE user_id = $1', [userId]);
      return this._getSystemRoleEntry(userId);
    }

    await pool.query(
      `INSERT INTO chat_user_roles (user_id, role, assigned_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id)
       DO UPDATE SET role = EXCLUDED.role, assigned_by = EXCLUDED.assigned_by, updated_at = CURRENT_TIMESTAMP`,
      [userId, role, actor.id]
    );

    return this._getSystemRoleEntry(userId);
  }

  static async _assertRoomVisible(roomId, userId) {
    const systemRole = await this._getSystemRole(userId);
    const result = await pool.query(
      `SELECT r.room_id, r.visibility, m.membership
       FROM chat_rooms r
       LEFT JOIN chat_room_members m ON m.room_id = r.room_id AND m.user_id = $2
       WHERE r.room_id = $1`,
      [roomId, userId]
    );

    const room = result.rows[0];
    if (!room) throw buildError('Room not found', 404);
    if (systemRole === 'admin') return room;
    if (room.visibility === 'public') return room;
    if (!room.membership || room.membership === 'leave') throw buildError('Forbidden', 403);
    return room;
  }

  static async _assertJoined(roomId, userId) {
    if (await this._isSystemAdmin(userId)) return;
    const roomResult = await pool.query(
      `SELECT is_direct
       FROM chat_rooms
       WHERE room_id = $1
       LIMIT 1`,
      [roomId]
    );
    const room = roomResult.rows[0];
    if (!room) throw buildError('Room not found', 404);

    const membership = await this._getMembership(roomId, userId);
    if (membership === 'join') return;
    if (room.is_direct && membership === 'invite') return;
    throw buildError('Joined membership required', 403);
  }

  static async _assertCanInvite(roomId, userId) {
    if (await this._isSystemAdmin(userId)) return { user_id: userId, member_role: 'admin', membership: 'join', system_role: 'admin' };
    const member = await this._getRequiredJoinedMember(roomId, userId);
    if (!['owner', 'admin'].includes(member.member_role)) throw buildError('Forbidden', 403);
    return member;
  }

  static async _assertCanManageRoles(roomId, userId) {
    if (await this._isSystemAdmin(userId)) return { user_id: userId, member_role: 'admin', membership: 'join', system_role: 'admin' };
    const member = await this._getRequiredJoinedMember(roomId, userId);
    if (!['owner', 'admin'].includes(member.member_role)) throw buildError('Forbidden', 403);
    return member;
  }

  static async _assertCanKick(roomId, userId) {
    if (await this._isSystemAdmin(userId)) return { user_id: userId, member_role: 'admin', membership: 'join', system_role: 'admin' };
    const member = await this._getRequiredJoinedMember(roomId, userId);
    if (!['owner', 'admin'].includes(member.member_role)) throw buildError('Forbidden', 403);
    return member;
  }

  static async _assertCanLeave(roomId, userId) {
    if (await this._isSystemAdmin(userId)) return { user_id: userId, member_role: 'admin', membership: 'join', system_role: 'admin' };
    const member = await this._getRequiredJoinedMember(roomId, userId);
    if (member.member_role === 'owner') {
      await this._assertNotLastOwner(roomId, userId);
    }
    return member;
  }

  static async _getMembership(roomId, userId) {
    const result = await pool.query(
      `SELECT membership
       FROM chat_room_members
       WHERE room_id = $1 AND user_id = $2`,
      [roomId, userId]
    );
    return result.rows[0] ? result.rows[0].membership : null;
  }

  static async _getMember(roomId, userId) {
    const result = await pool.query(
      `SELECT room_id, user_id, membership, member_role, invited_by, joined_at, left_at, last_read_event_id, created_at, updated_at
       FROM chat_room_members
       WHERE room_id = $1 AND user_id = $2
       LIMIT 1`,
      [roomId, userId]
    );
    return result.rows[0] || null;
  }

  static async _getRequiredJoinedMember(roomId, userId) {
    const member = await this._getMember(roomId, userId);
    if (!member || member.membership !== 'join') throw buildError('Joined membership required', 403);
    return member;
  }

  static async _getRoomSettings(roomId, userId) {
    const result = await pool.query(
      `SELECT is_hidden, is_favorite, created_at, updated_at
       FROM chat_room_user_settings
       WHERE room_id = $1 AND user_id = $2
       LIMIT 1`,
      [roomId, userId]
    );
    return result.rows[0] || { is_hidden: false, is_favorite: false, created_at: null, updated_at: null };
  }

  static async _getRoomRecipientIds(roomId) {
    const result = await pool.query(
      `SELECT DISTINCT user_id
       FROM chat_room_members
       WHERE room_id = $1
         AND membership IN ('join', 'invite')`,
      [roomId]
    );
    return result.rows.map((row) => Number(row.user_id)).filter(Boolean);
  }

  static async _notifyRoomMembers(roomId, kind, payload = {}) {
    try {
      const recipientIds = await this._getRoomRecipientIds(roomId);
      if (recipientIds.length === 0) return 0;
      return ChatBroadcaster.sendToUsers(recipientIds, 'chat.update', {
        kind,
        ...payload
      });
    } catch (error) {
      console.warn('Chat notification failed', {
        room_id: roomId,
        kind,
        error: error && error.message ? error.message : String(error)
      });
      return 0;
    }
  }

  static async _getSystemRole(userId) {
    if (config.adminUserIds.includes(Number(userId))) return 'admin';
    const result = await pool.query(
      `SELECT role
       FROM chat_user_roles
       WHERE user_id = $1
       LIMIT 1`,
      [userId]
    );
    return result.rows[0] ? result.rows[0].role : 'user';
  }

  static async _getSystemRoleEntry(userId) {
    const normalizedUserId = Number(userId);
    if (config.adminUserIds.includes(normalizedUserId)) {
      return {
        user_id: normalizedUserId,
        role: 'admin',
        assigned_by: null,
        created_at: null,
        updated_at: null,
        source: 'env'
      };
    }
    const result = await pool.query(
      `SELECT user_id, role, assigned_by, created_at, updated_at
       FROM chat_user_roles
       WHERE user_id = $1
       LIMIT 1`,
      [normalizedUserId]
    );
    if (result.rows[0]) return { ...result.rows[0], source: 'db' };
    return {
      user_id: normalizedUserId,
      role: 'user',
      assigned_by: null,
      created_at: null,
      updated_at: null,
      source: 'default'
    };
  }

  static async _isSystemAdmin(userId) {
    return (await this._getSystemRole(userId)) === 'admin';
  }

  static async _assertSystemAdmin(userId) {
    if (!(await this._isSystemAdmin(userId))) {
      throw buildError('System admin required', 403);
    }
  }

  static async _assertAuthenticated(actor) {
    if (!actor || !actor.id) throw buildError('Authentication required', 401);
  }

  static async _assertNotLastOwner(roomId, userId) {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS owner_count
       FROM chat_room_members
       WHERE room_id = $1
         AND membership = 'join'
         AND member_role = 'owner'`,
      [roomId]
    );
    const ownerCount = result.rows[0] ? Number(result.rows[0].owner_count) : 0;
    const member = await this._getMember(roomId, userId);
    if (member && member.member_role === 'owner' && ownerCount <= 1) {
      throw buildError('Room must have at least one owner', 400);
    }
  }

  static async _findDirectRoom(memberIds) {
    const sortedIds = [...memberIds].sort((a, b) => a - b);
    const result = await pool.query(
      `SELECT r.room_id
       FROM chat_rooms r
       JOIN chat_room_members m ON m.room_id = r.room_id
       WHERE r.is_direct = TRUE
         AND m.membership IN ('join', 'invite')
       GROUP BY r.room_id
       HAVING COUNT(DISTINCT m.user_id) = 2
          AND ARRAY_AGG(DISTINCT m.user_id ORDER BY m.user_id) = $1::int[]
       ORDER BY MAX(r.updated_at) DESC
       LIMIT 1`,
      [sortedIds]
    );
    return result.rows[0] ? result.rows[0].room_id : null;
  }

  static async _decorateRooms(rooms, actor, requestHeaders = {}, options = {}) {
    if (!Array.isArray(rooms) || rooms.length === 0) return rooms;

    const directRoomRows = rooms.filter((room) => room && room.is_direct && Array.isArray(room.member_ids) && room.member_ids.length >= 2);
    if (directRoomRows.length === 0) {
      return rooms.map((room) => ({
        ...room,
        display_name: room && room.name ? room.name : null,
        direct_name: room && room.is_direct ? (room.name || null) : null
      }));
    }

    const userIds = [...new Set(directRoomRows.flatMap((room) => room.member_ids.map(Number).filter(Boolean)))];
    const usersById = await this._fetchUsersByIds(userIds, requestHeaders);
    if (actor && actor.id) {
      usersById.set(Number(actor.id), actor);
    }

    return rooms.map((room) => {
      if (!room || !room.is_direct || !Array.isArray(room.member_ids) || room.member_ids.length < 2) {
        return {
          ...room,
          display_name: room && room.name ? room.name : null,
          direct_name: room && room.is_direct ? (room.name || null) : null
        };
      }

      const memberIds = room.member_ids.map(Number).filter(Boolean);
      const labels = memberIds.map((memberId) => pickLogin(usersById.get(memberId), memberId));
      const canonicalName = [...labels].sort((a, b) => a.localeCompare(b)).join('/');
      let displayName = canonicalName;

      if (options.listMode && actor && memberIds.includes(Number(actor.id))) {
        const otherMemberId = memberIds.find((memberId) => Number(memberId) !== Number(actor.id));
        if (otherMemberId) {
          displayName = pickDisplayName(usersById.get(otherMemberId), otherMemberId);
        }
      }

      return {
        ...room,
        name: displayName,
        display_name: displayName,
        direct_name: canonicalName
      };
    });
  }

  static async _attachRoomMembers(rooms, requestHeaders = {}) {
    if (!Array.isArray(rooms) || rooms.length === 0) return rooms;

    const memberRows = rooms.flatMap((room) => (Array.isArray(room && room.members) ? room.members : []));
    if (memberRows.length === 0) {
      return rooms.map((room) => ({
        ...room,
        members: Array.isArray(room && room.members) ? room.members : []
      }));
    }

    const userIds = [...new Set(memberRows.map((member) => Number(member.user_id)).filter(Boolean))];
    const usersById = await this._fetchUsersByIds(userIds, requestHeaders);

    return rooms.map((room) => {
      const members = (Array.isArray(room && room.members) ? room.members : []).map((member) => {
        const userId = Number(member.user_id);
        const user = usersById.get(userId) || null;
        const fullName = pickDisplayName(user, userId);
        const login = pickLogin(user, userId);

        return {
          user_id: userId,
          login,
          full_name: fullName,
          display_name: fullName === login ? login : `${fullName} (${login})`,
          membership: member.membership || null,
          member_role: member.member_role || null
        };
      });

      return {
        ...room,
        members
      };
    });
  }

  static async _fetchUsersByIds(userIds, requestHeaders = {}) {
    const ids = [...new Set((Array.isArray(userIds) ? userIds : []).map(Number).filter(Boolean))];
    const result = new Map();
    if (ids.length === 0) return result;

    const headers = {};
    if (requestHeaders.authorization) headers.Authorization = requestHeaders.authorization;
    if (requestHeaders.cookie) headers.Cookie = requestHeaders.cookie;

    const responses = await Promise.all(ids.map(async (userId) => {
      try {
        const response = await fetch(`${config.authServiceUrl}/api/users/${userId}`, {
          method: 'GET',
          headers
        });
        if (!response.ok) return [userId, null];
        const payload = await response.json();
        const user = payload && payload.data ? payload.data : payload;
        return [userId, user && user.id ? user : null];
      } catch (error) {
        return [userId, null];
      }
    }));

    for (const [userId, user] of responses) {
      result.set(userId, user);
    }

    return result;
  }

  static async _buildDirectRoomName(memberIds, actor, requestHeaders = {}) {
    const normalizedMemberIds = [...new Set((Array.isArray(memberIds) ? memberIds : []).map(Number).filter(Boolean))];
    if (normalizedMemberIds.length < 2) {
      const actorLogin = pickLogin(actor, actor && actor.id ? actor.id : 'me');
      return {
        canonical_name: actorLogin,
        display_name: actorLogin
      };
    }

    const usersById = await this._fetchUsersByIds(normalizedMemberIds, requestHeaders);
    if (actor && actor.id) {
      usersById.set(Number(actor.id), actor);
    }
    const labels = normalizedMemberIds.map((memberId) => pickLogin(usersById.get(memberId), memberId));
    const canonicalName = [...labels].sort((a, b) => a.localeCompare(b)).join('/');
    const otherMemberId = normalizedMemberIds.find((memberId) => Number(memberId) !== Number(actor.id));
    const displayName = otherMemberId ? pickLogin(usersById.get(otherMemberId), otherMemberId) : canonicalName;

    return {
      canonical_name: canonicalName,
      display_name: displayName
    };
  }

  static async _getRoomEvent(roomId, eventId) {
    const result = await pool.query(
      `SELECT id, event_id, room_id, sender_id, event_type, state_key, content, relates_to, relation_event_id, relation_type, reaction_key, origin_server_ts, created_at
       FROM chat_events
       WHERE room_id = $1 AND event_id = $2
       LIMIT 1`,
      [roomId, eventId]
    );
    const row = result.rows[0];
    if (!row) throw buildError('Event not found', 404);
    return row;
  }

  static async _getOwnEditableMessage(roomId, eventId, userId) {
    const row = await this._getRoomEvent(roomId, eventId);
    if (row.event_type !== 'm.room.message') throw buildError('Only message events can be modified', 400);
    if (Number(row.sender_id) !== Number(userId)) throw buildError('Only sender can modify message', 403);
    return row;
  }

  static async _buildTimeline(events, currentUserId, requestHeaders = {}) {
    if (!events.length) return [];
    const eventIds = events.map((event) => event.event_id);
    const related = await pool.query(
      `SELECT id, event_id, room_id, sender_id, event_type, state_key, content, relates_to, relation_event_id, relation_type, reaction_key, origin_server_ts, created_at
       FROM chat_events
       WHERE relation_event_id = ANY($1::varchar[])
       ORDER BY id ASC`,
      [eventIds]
    );

    return this._hydrateTimelineRows(events, related.rows, currentUserId, requestHeaders);
  }

  static async _hydrateSyncTimeline(roomId, events, currentUserId, requestHeaders = {}) {
    if (!events.length) return [];

    const relationEvents = events.filter((event) => event.relation_event_id);
    const directTimelineEvents = events.filter((event) => !event.relation_event_id);
    const messageEvents = directTimelineEvents.filter((event) => event.event_type === 'm.room.message');

    const targetEventIds = [...new Set(relationEvents.map((event) => event.relation_event_id).filter(Boolean))];
    const missingTargetEventIds = targetEventIds.filter((eventId) => !messageEvents.some((event) => event.event_id === eventId));

    let referencedMessages = [];
    if (missingTargetEventIds.length) {
      const result = await pool.query(
        `SELECT id, event_id, room_id, sender_id, event_type, state_key, content, relates_to, relation_event_id, relation_type, reaction_key, origin_server_ts, created_at
         FROM chat_events
         WHERE room_id = $1
           AND event_id = ANY($2::varchar[])
           AND event_type = 'm.room.message'
         ORDER BY id ASC`,
        [roomId, missingTargetEventIds]
      );
      referencedMessages = result.rows;
    }

    const baseMessages = [...messageEvents, ...referencedMessages];
    const baseMessageIds = [...new Set(baseMessages.map((event) => event.event_id))];

    let relatedRows = relationEvents;
    if (baseMessageIds.length) {
      const relatedResult = await pool.query(
        `SELECT id, event_id, room_id, sender_id, event_type, state_key, content, relates_to, relation_event_id, relation_type, reaction_key, origin_server_ts, created_at
         FROM chat_events
         WHERE relation_event_id = ANY($1::varchar[])
         ORDER BY id ASC`,
        [baseMessageIds]
      );
      relatedRows = relatedResult.rows;
    }

    const hydratedMessages = await this._hydrateTimelineRows(baseMessages, relatedRows, currentUserId, requestHeaders);
    const hydratedById = new Map(hydratedMessages.map((event) => [event.event_id, event]));
    const appendedIds = new Set();
    const timeline = [];

    for (const event of directTimelineEvents) {
      if (event.event_type === 'm.room.message') {
        const hydrated = hydratedById.get(event.event_id);
        if (hydrated) {
          timeline.push({
            ...hydrated,
            sync_update: false
          });
          appendedIds.add(event.event_id);
        }
      } else {
        timeline.push(event);
      }
    }

    for (const relationEvent of relationEvents) {
      const hydratedTarget = hydratedById.get(relationEvent.relation_event_id);
      if (!hydratedTarget) continue;
      if (appendedIds.has(hydratedTarget.event_id)) continue;

      timeline.push({
        ...hydratedTarget,
        sync_update: true,
        sync_trigger_event_id: relationEvent.event_id,
        sync_trigger_event_type: relationEvent.event_type
      });
      appendedIds.add(hydratedTarget.event_id);
    }

    return timeline.sort((a, b) => {
      const aId = Number(a.id) || 0;
      const bId = Number(b.id) || 0;
      return aId - bId;
    });
  }

  static async _hydrateTimelineRows(events, relatedRows = [], currentUserId = null, requestHeaders = {}) {
    const relatedMap = new Map();
    for (const row of relatedRows) {
      const key = row.relation_event_id;
      if (!key) continue;
      if (!relatedMap.has(key)) relatedMap.set(key, []);
      relatedMap.get(key).push(row);
    }

    const senderIds = [...new Set(events.map((event) => Number(event.sender_id)).filter(Boolean))];
    const usersById = await this._fetchUsersByIds(senderIds, requestHeaders);

    return events.map((event) => {
      if (event.event_type !== 'm.room.message') return event;

      const senderUser = usersById.get(Number(event.sender_id)) || null;
      const senderProfile = formatSenderDisplay(senderUser, event.sender_id);

      const clones = relatedMap.get(event.event_id) || [];
      const edits = clones.filter((row) => row.relation_type === 'm.replace');
      const redactions = clones.filter((row) => row.relation_type === 'm.redaction');
      const reactionEvents = clones.filter((row) => row.relation_type === 'm.annotation');

      const latestEdit = edits.length ? edits[edits.length - 1] : null;
      const isDeleted = redactions.length > 0;
      const reactionsByKey = new Map();

      for (const reaction of reactionEvents) {
        const key = reaction.reaction_key || (reaction.content && reaction.content.key) || null;
        if (!key) continue;
        if (!reactionsByKey.has(key)) {
          reactionsByKey.set(key, { key, count: 0, user_ids: [], reacted_by_me: false });
        }
        const bucket = reactionsByKey.get(key);
        bucket.count += 1;
        bucket.user_ids.push(reaction.sender_id);
        if (currentUserId != null && Number(reaction.sender_id) === Number(currentUserId)) {
          bucket.reacted_by_me = true;
        }
      }

      const content = JSON.parse(JSON.stringify(event.content || {}));
      if (latestEdit && latestEdit.content && latestEdit.content['m.new_content']) {
        content.body = latestEdit.content['m.new_content'].body;
        content.msgtype = latestEdit.content['m.new_content'].msgtype;
      }
      if (isDeleted) {
        content.body = null;
        content.deleted = true;
        content.attachments = [];
      }

      return {
        ...event,
        ...senderProfile,
        content,
        edited: Boolean(latestEdit),
        edited_at: latestEdit ? latestEdit.created_at : null,
        edited_by_event_id: latestEdit ? latestEdit.event_id : null,
        deleted: isDeleted,
        deleted_at: redactions.length ? redactions[redactions.length - 1].created_at : null,
        deleted_by_event_id: redactions.length ? redactions[redactions.length - 1].event_id : null,
        reactions: Array.from(reactionsByKey.values())
      };
    });
  }

  static async _insertEvent(executor, { roomId, senderId, eventType, stateKey = null, content = {}, relatesTo = null, relationEventId = null, relationType = null, reactionKey = null }) {
    const eventId = buildEventId();
    const result = await executor.query(
      `INSERT INTO chat_events (event_id, room_id, sender_id, event_type, state_key, content, relates_to, relation_event_id, relation_type, reaction_key)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10)
       RETURNING id, event_id, room_id, sender_id, event_type, state_key, content, relates_to, relation_event_id, relation_type, reaction_key, origin_server_ts, created_at`,
      [eventId, roomId, senderId, eventType, stateKey, JSON.stringify(content || {}), relatesTo ? JSON.stringify(relatesTo) : null, relationEventId, relationType, reactionKey]
    );

    await executor.query(
      `UPDATE chat_rooms
       SET updated_at = CURRENT_TIMESTAMP
       WHERE room_id = $1`,
      [roomId]
    );

    return result.rows[0];
  }
}

module.exports = ChatService;
