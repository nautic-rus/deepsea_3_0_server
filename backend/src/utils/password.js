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

module.exports = {
  hashPassword,
  comparePassword
};




