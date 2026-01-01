/**
 * Сервис аутентификации
 */

const User = require('../../db/models/User');
const Session = require('../../db/models/Session');
const { comparePassword } = require('../../utils/password');
const { generateAccessToken, generateRefreshToken, getTokenExpiration } = require('../../utils/jwt');
const AuthError = require('../../errors/AuthError');

class AuthService {
  /**
   * Вход в систему
   */
  static async login(username, password, ipAddress, userAgent) {
    // Найти пользователя
    const user = await User.findByUsername(username);
    
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

    // Обновить время последнего входа
    await User.updateLastLogin(user.id);

    // Генерация токенов
    const tokenPayload = {
      id: user.id,
      username: user.username,
      email: user.email
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken();
    const expiresAt = getTokenExpiration();

    // Создать сессию
    await Session.create({
      user_id: user.id,
      token: accessToken,
      refresh_token: refreshToken,
      ip_address: ipAddress,
      user_agent: userAgent,
      expires_at: expiresAt
    });

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

    // Найти активную сессию по refresh token
    const session = await Session.findByRefreshToken(refreshToken);
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
      await Session.deactivate(session.token);
    }

    // Создаём новую сессию
    await Session.create({
      user_id: user.id,
      token: accessToken,
      refresh_token: newRefreshToken,
      ip_address: ipAddress,
      user_agent: userAgent,
      expires_at: expiresAt
    });

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




