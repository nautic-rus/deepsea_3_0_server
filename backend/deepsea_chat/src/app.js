const express = require('express');
const cors = require('cors');
const routes = require('./routes');

const app = express();

function parseCorsOrigins(value) {
  const raw = String(value || '').trim();
  if (!raw || raw === '*') return '*';
  const origins = raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return origins.length ? origins : '*';
}

app.use(cors({
  origin: parseCorsOrigins(process.env.CHAT_CORS_ORIGINS),
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

app.use(routes);

app.use((error, req, res, next) => {
  const statusCode = error.statusCode || 500;
  if (statusCode >= 500) {
    console.error(error);
  }
  res.status(statusCode).json({
    error: error.message || 'Internal server error'
  });
});

module.exports = app;
