

// Загрузка переменных окружения (use repository `env` file so server and scripts behave the same)
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'env') });

const { initializeEnvironmentSettings } = require('./config/environmentSettings');

async function startServer() {
  await initializeEnvironmentSettings();

  // Initialize file logger after DB-backed settings are applied to process.env.
  require('./utils/logger');

  const app = require('./app');
  const config = require('./config');

  const port = config.port || 3000;
  const host = config.host || '0.0.0.0';

  app.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port}`);
    console.log(`Environment: ${config.env}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server', error && (error.stack || error.message || error));
  process.exit(1);
});

