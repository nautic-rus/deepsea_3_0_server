const User = require('../../db/models/User');
const UserRocketChat = require('../../db/models/UserRocketChat');

class UserRocketChatService {
  /**
   * Set or update mapping for a user
   * data: { rc_username, rc_user_id, rc_display_name }
   */
  static async setMapping(userId, data, actor = null) {
    // Ensure user exists
    const user = await User.findById(userId);
    if (!user) {
      const err = new Error('User not found'); err.statusCode = 404; throw err;
    }

    const existing = await UserRocketChat.findByUserId(userId);
    if (existing) {
      const updated = await UserRocketChat.updateByUserId(userId, data);
      return updated;
    }

    // create new
    const created = await UserRocketChat.create(Object.assign({ user_id: userId }, data));
    return created;
  }

  /**
   * Get mapping for a user
   */
  static async getMapping(userId) {
    return await UserRocketChat.findByUserId(userId);
  }

  /**
   * Delete mapping for a user
   */
  static async deleteMapping(userId) {
    const existing = await UserRocketChat.findByUserId(userId);
    if (!existing) return false;
    await UserRocketChat.deleteByUserId(userId);
    return true;
  }
}

module.exports = UserRocketChatService;
