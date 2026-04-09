const DocumentUploadNotificationService = require('../api/services/documentUploadNotificationService');

const POLL_INTERVAL_MS = Number(process.env.DOCUMENT_UPLOAD_AGGREGATOR_INTERVAL_MS || 2000);
const QUIET_PERIOD_SECONDS = Number(process.env.DOCUMENT_UPLOAD_AGGREGATOR_TIMEOUT_SECONDS || 20);
const PROCESSING_TIMEOUT_SECONDS = Number(process.env.DOCUMENT_UPLOAD_AGGREGATOR_PROCESSING_TIMEOUT_SECONDS || 300);
const BATCH_LIMIT = Number(process.env.DOCUMENT_UPLOAD_AGGREGATOR_BATCH_LIMIT || 50);

let timer = null;
let isRunning = false;

async function runOnce() {
  if (isRunning) return null;

  isRunning = true;
  try {
    return await DocumentUploadNotificationService.flushReadyGroups({
      quietPeriodSeconds: QUIET_PERIOD_SECONDS,
      processingTimeoutSeconds: PROCESSING_TIMEOUT_SECONDS,
      limit: BATCH_LIMIT
    });
  } catch (error) {
    console.error('Document upload aggregator failed', error && (error.stack || error.message || error));
    return null;
  } finally {
    isRunning = false;
  }
}

function start() {
  if (timer) return;

  timer = setInterval(() => {
    runOnce().catch((error) => {
      console.error('Document upload aggregator tick failed', error && (error.stack || error.message || error));
    });
  }, POLL_INTERVAL_MS);

  if (typeof timer.unref === 'function') timer.unref();
}

function stop() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}

module.exports = {
  start,
  stop,
  runOnce
};
