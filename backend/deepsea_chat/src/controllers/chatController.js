const ChatService = require('../services/chatService');

class ChatController {
  static async createRoom(req, res, next) {
    try {
      const data = await ChatService.createRoom(req.body || {}, req.user, req.headers || {});
      res.status(201).json({ data });
    } catch (error) {
      next(error);
    }
  }

  static async listRooms(req, res, next) {
    try {
      const data = await ChatService.listRooms(req.user, req.headers || {}, req.query || {});
      res.json({ data });
    } catch (error) {
      next(error);
    }
  }

  static async getRoom(req, res, next) {
    try {
      const data = await ChatService.getRoom(req.params.roomId, req.user, req.headers || {});
      res.json({ data });
    } catch (error) {
      next(error);
    }
  }

  static async listMembers(req, res, next) {
    try {
      const data = await ChatService.listMembers(req.params.roomId, req.user);
      res.json({ data });
    } catch (error) {
      next(error);
    }
  }

  static async invite(req, res, next) {
    try {
      const userId = req.body ? req.body.user_id : null;
      const data = await ChatService.invite(req.params.roomId, userId, req.user);
      res.status(201).json({ data });
    } catch (error) {
      next(error);
    }
  }

  static async join(req, res, next) {
    try {
      const data = await ChatService.join(req.params.roomId, req.user);
      res.status(201).json({ data });
    } catch (error) {
      next(error);
    }
  }

  static async leave(req, res, next) {
    try {
      const data = await ChatService.leave(req.params.roomId, req.user);
      res.json({ data });
    } catch (error) {
      next(error);
    }
  }

  static async updateMemberRole(req, res, next) {
    try {
      const userId = req.body ? req.body.user_id : null;
      const role = req.body ? req.body.role : null;
      const data = await ChatService.updateMemberRole(req.params.roomId, userId, role, req.user);
      res.json({ data });
    } catch (error) {
      next(error);
    }
  }

  static async kickMember(req, res, next) {
    try {
      const userId = req.body ? req.body.user_id : null;
      const data = await ChatService.kickMember(req.params.roomId, userId, req.user);
      res.json({ data });
    } catch (error) {
      next(error);
    }
  }

  static async deleteRoom(req, res, next) {
    try {
      const data = await ChatService.deleteRoom(req.params.roomId, req.user);
      res.json({ data });
    } catch (error) {
      next(error);
    }
  }

  static async sendMessage(req, res, next) {
    try {
      const data = await ChatService.sendMessage(req.params.roomId, req.body || {}, req.user);
      res.status(201).json({ data });
    } catch (error) {
      next(error);
    }
  }

  static async listMessages(req, res, next) {
    try {
      const data = await ChatService.listMessages(req.params.roomId, req.query || {}, req.user, req.headers || {});
      res.json({ data });
    } catch (error) {
      next(error);
    }
  }

  static async sendFiles(req, res, next) {
    try {
      const data = await ChatService.sendFiles(req.params.roomId, req.body || {}, req.user);
      res.status(201).json({ data });
    } catch (error) {
      next(error);
    }
  }

  static async addReaction(req, res, next) {
    try {
      const data = await ChatService.addReaction(req.params.roomId, req.params.eventId, req.body || {}, req.user);
      res.status(201).json({ data });
    } catch (error) {
      next(error);
    }
  }

  static async removeReaction(req, res, next) {
    try {
      const data = await ChatService.removeReaction(req.params.roomId, req.params.eventId, req.query.key, req.user);
      res.json({ data });
    } catch (error) {
      next(error);
    }
  }

  static async editMessage(req, res, next) {
    try {
      const data = await ChatService.editMessage(req.params.roomId, req.params.eventId, req.body || {}, req.user);
      res.status(201).json({ data });
    } catch (error) {
      next(error);
    }
  }

  static async deleteMessage(req, res, next) {
    try {
      const data = await ChatService.deleteMessage(req.params.roomId, req.params.eventId, req.user);
      res.json({ data });
    } catch (error) {
      next(error);
    }
  }

  static async setReadMarker(req, res, next) {
    try {
      const eventId = req.body ? req.body.event_id : null;
      const data = await ChatService.setReadMarker(req.params.roomId, eventId, req.user);
      res.json({ data });
    } catch (error) {
      next(error);
    }
  }

  static async markAllRead(req, res, next) {
    try {
      const data = await ChatService.markAllRead(req.user);
      res.json({ data });
    } catch (error) {
      next(error);
    }
  }

  static async updateRoomPreferences(req, res, next) {
    try {
      const data = await ChatService.updateRoomPreferences(req.params.roomId, req.body || {}, req.user);
      res.json({ data });
    } catch (error) {
      next(error);
    }
  }

  static async sync(req, res, next) {
    try {
      const data = await ChatService.sync(req.query || {}, req.user, req.headers || {});
      res.json({ data });
    } catch (error) {
      next(error);
    }
  }

  static async stream(req, res, next) {
    try {
      await ChatService.openStream(req.user, res);
    } catch (error) {
      next(error);
    }
  }

  static async listSystemRoles(req, res, next) {
    try {
      const data = await ChatService.listSystemRoles(req.user);
      res.json({ data });
    } catch (error) {
      next(error);
    }
  }

  static async getSystemRole(req, res, next) {
    try {
      const data = await ChatService.getSystemRoleForUser(Number(req.params.userId), req.user);
      res.json({ data });
    } catch (error) {
      next(error);
    }
  }

  static async setSystemRole(req, res, next) {
    try {
      const data = await ChatService.setSystemRole(Number(req.params.userId), req.body || {}, req.user);
      res.json({ data });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ChatController;
