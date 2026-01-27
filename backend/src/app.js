/**
 * Главный файл приложения Express
 */

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const apiRoutes = require('./api/routes');
const errorHandler = require('./api/middleware/errorHandler');
const config = require('./config');
const { swaggerUi, swaggerSpec } = require('./config/swagger');
const storageConfig = require('./config/storage');

const app = express();

// Middleware
// Allow requests from any origin. This sets Access-Control-Allow-Origin: *
// and permits common methods and headers used by the frontend.
app.use(cors({
  origin: '*',
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Disposition'],
  optionsSuccessStatus: 204
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Parse cookies (used for HttpOnly token cookies)
app.use(cookieParser());

// Trust proxy для получения реального IP адреса
app.set('trust proxy', true);

// Функция для динамической загрузки swagger spec
function getSwaggerSpec() {
  const swaggerPath = path.join(__dirname, '../docs/api/swagger.json');
  const swaggerContent = fs.readFileSync(swaggerPath, 'utf8');
  return JSON.parse(swaggerContent);
}

// Swagger UI - загружаем динамически при каждом запросе
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', (req, res, next) => {
  // Prevent the browser from caching the HTML UI page so it will request
  // /api-docs.json each time (which we also mark as no-cache below).
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  const spec = getSwaggerSpec();
  const swaggerUiHandler = swaggerUi.setup(spec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'DeepSea 3.0 API Documentation',
  });
  swaggerUiHandler(req, res, next);
});

// Swagger JSON endpoint - загружаем динамически
app.get('/api-docs.json', (req, res) => {
  // Ensure the JSON is not cached by browsers or intermediate proxies so
  // updates to `backend/docs/api/swagger.json` are visible immediately.
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  const spec = getSwaggerSpec();
  res.send(spec);
});

// API Routes
app.use('/api', apiRoutes);

// Serve local uploads (if any) — mount path and directory come from config/storage
try {
  app.use(storageConfig.mountPath, express.static(storageConfig.uploadsDir));
} catch (e) {
  console.error('Failed to mount uploads static directory', e && e.message ? e.message : e);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Error handler (должен быть последним)
app.use(errorHandler);

module.exports = app;

