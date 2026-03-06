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

// Prometheus client for metrics
const client = require('prom-client');
const os = require('os');

// Collect default metrics (CPU, memory, eventloop, etc.)
client.collectDefaultMetrics({ timeout: 5000 });

const httpRequestDurationMilliseconds = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'code'],
  buckets: [50, 100, 200, 300, 400, 500, 1000]
});

// Counter for total requests (useful for request rate)
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'code']
});

// Gauges for CPU% and Memory%
const processCpuPercent = new client.Gauge({
  name: 'process_cpu_percent',
  help: 'Process CPU usage percent (0-100)'
});

const processMemoryPercent = new client.Gauge({
  name: 'process_memory_percent',
  help: 'Process memory usage percent (0-100)'
});

// Helper to compute CPU percentage for the Node process
let lastUsage = process.cpuUsage();
let lastTime = Date.now();
function updateCpuMemoryMetrics() {
  try {
    const curUsage = process.cpuUsage();
    const curTime = Date.now();
    const elapsedMicros = (curTime - lastTime) * 1000; // ms -> µs
    const userDiff = curUsage.user - lastUsage.user;
    const systemDiff = curUsage.system - lastUsage.system;
    const totalProcessMicros = userDiff + systemDiff;

    // number of logical CPUs
    const cpuCount = os.cpus().length || 1;

    // CPU percent = (process CPU time / elapsed time) / cpuCount * 100
    const cpuPercent = Math.min(100, (totalProcessMicros / elapsedMicros) / cpuCount * 100);
    if (!Number.isNaN(cpuPercent) && Number.isFinite(cpuPercent)) {
      processCpuPercent.set(cpuPercent);
    }

    const mem = process.memoryUsage();
    const totalMem = os.totalmem() || 1;
    const memPercent = Math.min(100, (mem.rss / totalMem) * 100);
    if (!Number.isNaN(memPercent) && Number.isFinite(memPercent)) {
      processMemoryPercent.set(memPercent);
    }

    lastUsage = curUsage;
    lastTime = curTime;
  } catch (e) {
    // ignore metric calculation errors
  }
}

// Update CPU/memory gauges every 5 seconds
setInterval(updateCpuMemoryMetrics, 5000);
updateCpuMemoryMetrics();

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

// Middleware: observe request durations for Prometheus
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const route = req.route && req.route.path ? req.route.path : req.path;
    const duration = Date.now() - start;
    try {
      httpRequestDurationMilliseconds.labels(req.method, route, res.statusCode).observe(duration);
      httpRequestsTotal.labels(req.method, route, res.statusCode).inc();
    } catch (e) {
      // ignore metric errors
    }
  });
  next();
});

// Metrics endpoint for Prometheus to scrape
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', client.register.contentType);
    res.send(await client.register.metrics());
  } catch (e) {
    res.status(500).send(e.message);
  }
});

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

