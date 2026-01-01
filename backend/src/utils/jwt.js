/**
 * Утилиты для работы с JWT токенами
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

/**
 * Генерация access токена
 */
function generateAccessToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
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
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Верификация refresh токена
 */
function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
}

/**
 * Получить время истечения токена
 */
function getTokenExpiration() {
  const expiresIn = JWT_EXPIRES_IN;
  const now = new Date();
  
  // Парсинг времени (например, '24h', '7d')
  let milliseconds = 0;
  if (expiresIn.endsWith('h')) {
    milliseconds = parseInt(expiresIn) * 60 * 60 * 1000;
  } else if (expiresIn.endsWith('d')) {
    milliseconds = parseInt(expiresIn) * 24 * 60 * 60 * 1000;
  } else if (expiresIn.endsWith('m')) {
    milliseconds = parseInt(expiresIn) * 60 * 1000;
  } else if (expiresIn.endsWith('s')) {
    milliseconds = parseInt(expiresIn) * 1000;
  }
  
  return new Date(now.getTime() + milliseconds);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getTokenExpiration,
  JWT_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN
};




