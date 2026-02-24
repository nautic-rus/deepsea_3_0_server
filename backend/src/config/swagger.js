/**
 * Конфигурация Swagger
 */

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const fs = require('fs');

// Загружаем существующую спецификацию динамически (без кеширования)
function loadSwaggerSpec() {
  const swaggerPath = path.join(__dirname, '../../docs/api/swagger.json');
  try {
    const swaggerContent = fs.readFileSync(swaggerPath, 'utf8');
    return JSON.parse(swaggerContent);
  } catch (err) {
    // If the static swagger.json cannot be read or parsed, fall back to
    // the JSDoc-generated spec so the app still serves API docs.
    // Don't throw here to avoid crashing the server on doc issues.
    // eslint-disable-next-line no-console
    console.warn('Could not load static swagger.json, falling back to JSDoc-generated spec:', err.message);
    try {
      return swaggerJsdoc(swaggerOptions);
    } catch (e) {
      // If generation also fails, return an empty object to avoid crashes.
      // eslint-disable-next-line no-console
      console.error('Failed to generate swagger spec from JSDoc:', e.message);
      return {};
    }
  }
}

// Опции для swagger-jsdoc (для генерации документации из JSDoc комментариев)
const swaggerOptions = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'DeepSea 3.0 API',
      version: '3.0.0',
      description: 'API документация для системы DeepSea 3.0',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api.deepsea.example.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  // For compatibility with older versions of swagger-jsdoc which expect
  // `swaggerDefinition` instead of `definition`, expose the same object.
  swaggerDefinition: {
    openapi: '3.0.3',
    info: {
      title: 'DeepSea 3.0 API',
      version: '3.0.0',
      description: 'API документация для системы DeepSea 3.0',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  // Пути к файлам с JSDoc комментариями
  apis: [
    path.join(__dirname, '../api/routes/**/*.js'),
    path.join(__dirname, '../api/controllers/**/*.js'),
  ],
};

// Генерируем спецификацию из JSDoc (опционально, можно использовать существующий swagger.json)
const swaggerSpecFromJsdoc = swaggerJsdoc(swaggerOptions);

// Теперь загрузим основную спецификацию (статическую) с возможностью падения
// на сгенерированную из JSDoc, но делаем это после того как swaggerOptions
// уже определены чтобы избежать ошибок вызова swaggerJsdoc с undefined.
let swaggerSpec = loadSwaggerSpec();

module.exports = {
  swaggerUi,
  swaggerSpec, // Используем существующий swagger.json
  swaggerSpecFromJsdoc, // Альтернативная спецификация из JSDoc
  // Экспортируем загрузчик чтобы другие модули могли принудительно перечитать
  // спецификацию в рантайме, если это нужно (например для dev hot-reload).
  loadSwaggerSpec,
};

