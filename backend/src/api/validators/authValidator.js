/**
 * Валидаторы для аутентификации
 */

/**
 * Валидация данных для входа
 */
function validateLogin(req, res, next) {
  const { username, email, password } = req.body;

  const errors = [];

  // Allow either username or email as identifier
  if ((!username || typeof username !== 'string' || username.trim().length === 0) && (!email || typeof email !== 'string' || email.trim().length === 0)) {
    errors.push('Username or email is required');
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    errors.push('Password is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation error',
      messages: errors
    });
  }

  next();
}

module.exports = {
  validateLogin
};




