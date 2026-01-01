/**
 * Обработчик ошибок
 */

function errorHandler(err, req, res, next) {
  // Логирование ошибки
  console.error('Error:', err);

  // Если ошибка имеет статус код, используем его
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  // Формируем ответ
  const response = {
    error: message
  };

  // В режиме разработки добавляем стек трейс
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

module.exports = errorHandler;




