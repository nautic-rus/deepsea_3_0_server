/**
 * Сервис аутентификации
 */

const User = require('../../db/models/User');
const Session = require('../../db/models/Session');
const { comparePassword } = require('../../utils/password');
const { generateAccessToken, generateRefreshToken, getTokenExpiration } = require('../../utils/jwt');
const AuthError = require('../../errors/AuthError');

class AuthService {
  static _getMaxActiveSessionsPerUser() {
    const rawValue = Number(process.env.MAX_ACTIVE_SESSIONS_PER_USER);
    if (Number.isInteger(rawValue) && rawValue > 0) {
      return rawValue;
    }
    return 2;
  }

  /**
   * Вход в систему
   */
  static async login(identifier, password, ipAddress, userAgent) {
    // Найти пользователя по username или email
    let user = null;
    if (!identifier) {
      throw new AuthError('Invalid credentials', 401);
    }

    // Try as username first
    user = await User.findByUsername(identifier);
    // If not found and identifier looks like an email, try email
    if (!user && identifier && identifier.includes('@')) {
      user = await User.findByEmail(identifier);
    }

    if (!user) {
      throw new AuthError('Invalid credentials', 401);
    }

    // Проверить активность пользователя
    if (!user.is_active) {
      throw new AuthError('User account is deactivated', 403);
    }

    // Проверить пароль
    const isPasswordValid = await comparePassword(password, user.password_hash);
    
    if (!isPasswordValid) {
      throw new AuthError('Invalid credentials', 401);
    }

    // Генерация токенов
    const tokenPayload = {
      id: user.id,
      username: user.username,
      email: user.email
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken();
    const expiresAt = getTokenExpiration();

    // Создать сессию с ограничением активных сессий на пользователя
    await Session.createWithLimit({
      user_id: user.id,
      token: accessToken,
      refresh_token: refreshToken,
      ip_address: ipAddress,
      user_agent: userAgent,
      expires_at: expiresAt
    }, this._getMaxActiveSessionsPerUser());

    // Обновить время последнего входа только после успешного создания сессии
    try {
      await User.updateLastLogin(user.id);
    } catch (error) {
      console.error('Failed to update last_login after successful login', error && error.message ? error.message : error);
    }

    // Подготовить данные пользователя для ответа
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name
    };

    return {
      token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt.toISOString(),
      user: userData
    };
  }

  /**
   * Refresh tokens using refresh token
   */
  static async refresh(refreshToken, ipAddress, userAgent) {
    if (!refreshToken) {
      throw new AuthError('Refresh token required', 400);
    }

    return Session._runInTransaction(async (client) => {
      // Найти активную сессию по refresh token
      const session = await Session.findByRefreshToken(refreshToken, client, true);
      if (!session) {
        throw new AuthError('Invalid refresh token', 401);
      }

      // Найти пользователя
      const user = await User.findById(session.user_id);
      if (!user) {
        throw new AuthError('User not found', 401);
      }
      if (!user.is_active) {
        throw new AuthError('User account is deactivated', 403);
      }

      // Генерация новых токенов
      const tokenPayload = {
        id: user.id,
        username: user.username,
        email: user.email
      };

      const accessToken = generateAccessToken(tokenPayload);
      const newRefreshToken = generateRefreshToken();
      const expiresAt = getTokenExpiration();

      // Деактивируем старую сессию (по старому access token)
      if (session.token) {
        await Session.deactivate(session.token, client);
      }

      // Создаём новую сессию
      await Session.create({
        user_id: user.id,
        token: accessToken,
        refresh_token: newRefreshToken,
        ip_address: ipAddress,
        user_agent: userAgent,
        expires_at: expiresAt
      }, client);

      const userData = {
        id: user.id,
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name
      };

      return {
        token: accessToken,
        refresh_token: newRefreshToken,
        expires_at: expiresAt.toISOString(),
        user: userData
      };
    });
  }

  /**
   * Logout (deactivate session by access token)
   */
  static async logout(token) {
    if (!token) {
      throw new AuthError('Token required', 400);
    }

    await Session.deactivate(token);
    return true;
  }
}

module.exports = AuthService;


