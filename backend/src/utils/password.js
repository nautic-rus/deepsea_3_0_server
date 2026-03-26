/**
 * Утилиты для работы с паролями
 */

const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

/**
 * Хеширование пароля
 */
async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Проверка пароля
 */
async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Validate password according to policy:
 * - at least 8 characters
 * - contains upper and lower case letters
 * - contains at least one special character
 * - must not contain disallowed patterns (case-insensitive)
 * Returns an array of error messages (empty if valid)
 */
function validatePassword(password) {
  const errors = [];
  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
    return errors;
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Disallowed patterns (case-insensitive substrings)
  const blacklist = [
    'ship123', 'ship1234', '123ship', '1234ship'
  ];
  const lower = password.toLowerCase();
  for (const p of blacklist) {
    if (lower.includes(p)) {
      errors.push(`Password must not contain the pattern: ${p}`);
    }
  }

  return errors;
}

module.exports = {
  hashPassword,
  comparePassword,
  validatePassword
};






