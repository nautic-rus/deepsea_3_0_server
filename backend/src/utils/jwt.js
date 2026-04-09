/**
 * Утилиты для работы с JWT токенами
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

function getJwtConfig() {
  return {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'
  };
}

function parseDurationToMilliseconds(raw) {
  const value = String(raw || '').trim();
  const match = value.match(/^(\d+)([smhd])$/i);
  if (!match) return 0;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  switch (unit) {
    case 's':
      return amount * 1000;
    case 'm':
      return amount * 60 * 1000;
    case 'h':
      return amount * 60 * 60 * 1000;
    case 'd':
      return amount * 24 * 60 * 60 * 1000;
    default:
      return 0;
  }
}

/**
 * Генерация access токена
 */
function generateAccessToken(payload) {
  const config = getJwtConfig();
  return jwt.sign(payload, config.secret, {
    expiresIn: config.expiresIn
  });
}

/**
 * Генерация refresh токена
 */
function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

/**
 * Верификация access токена
 */
function verifyAccessToken(token) {
  try {
    return jwt.verify(token, getJwtConfig().secret);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Верификация refresh токена
 */
function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, getJwtConfig().refreshSecret);
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
}

/**
 * Получить время истечения токена
 */
function getTokenExpiration() {
  const expiresIn = getJwtConfig().expiresIn;
  const now = new Date();

  const milliseconds = parseDurationToMilliseconds(expiresIn);

  return new Date(now.getTime() + milliseconds);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getTokenExpiration,
  get JWT_EXPIRES_IN() {
    return getJwtConfig().expiresIn;
  },
  get REFRESH_TOKEN_EXPIRES_IN() {
    return getJwtConfig().refreshExpiresIn;
  }
};




