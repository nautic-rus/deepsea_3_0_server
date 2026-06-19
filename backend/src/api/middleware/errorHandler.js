/**
 * Обработчик ошибок
 */

function isDatabaseConnectivityError(err) {
  const code = String(err && err.code ? err.code : '').trim();
  const message = String(err && err.message ? err.message : '').toLowerCase();
  return (
    code === '57P01' ||
    code === '57P02' ||
    code === '57P03' ||
    code === '08006' ||
    code === '08003' ||
    code === 'ETIMEDOUT' ||
    code === 'ECONNRESET' ||
    message.includes('connection terminated') ||
    message.includes('connection refused') ||
    message.includes('server closed the connection') ||
    message.includes('database system is starting up') ||
    message.includes('database system is in recovery mode') ||
    message.includes('too many clients') ||
    message.includes('timeout')
  );
}

function errorHandler(err, req, res, next) {
  // Логирование ошибки
  console.error('Error:', err);

  // Если ошибка имеет статус код, используем его
  const statusCode = err.statusCode || (isDatabaseConnectivityError(err) ? 503 : 500);
  const message = err.message || 'Internal server error';

  // Формируем ответ
  const response = {
    error: message
  };

  if (err.details !== undefined) {
    response.details = err.details;
  }

  // В режиме разработки добавляем стек трейс
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

module.exports = errorHandler;


