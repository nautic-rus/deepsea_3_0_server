/**
 * Утилиты для работы с JWT токенами
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const UNSAFE_JWT_SECRET_VALUES = new Set([
  '',
  'your-secret-key-change-in-production',
  'your-refresh-secret-key-change-in-production'
]);

function normalizeSecret(value) {
  return String(value || '').trim();
}

function assertSecretConfigured(value, envName) {
  const secret = normalizeSecret(value);
  if (!secret || UNSAFE_JWT_SECRET_VALUES.has(secret)) {
    const err = new Error(`${envName} is not configured. Set a non-empty secret in environment_settings or process.env.`);
    err.statusCode = 500;
    throw err;
  }
  return secret;
}

function getJwtConfig() {
  return {
    secret: assertSecretConfigured(process.env.JWT_SECRET, 'JWT_SECRET'),
    refreshSecret: assertSecretConfigured(process.env.JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET'),
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

function assertJwtSecretsConfigured() {
  const config = getJwtConfig();
  return {
    secret: config.secret,
    refreshSecret: config.refreshSecret
  };
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getTokenExpiration,
  assertJwtSecretsConfigured,
  get JWT_EXPIRES_IN() {
    return getJwtConfig().expiresIn;
  },
  get REFRESH_TOKEN_EXPIRES_IN() {
    return getJwtConfig().refreshExpiresIn;
  }
};



