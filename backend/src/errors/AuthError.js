/**
 * Ошибки аутентификации
 */

class AuthError extends Error {
  constructor(message, statusCode = 401) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

module.exports = AuthError;




