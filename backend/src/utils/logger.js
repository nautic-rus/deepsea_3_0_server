const fs = require('fs');
const path = require('path');

const DEFAULT_LOCAL_DIR = path.join(__dirname, '..', '..', 'logs');
const PREFERRED_DIR = process.env.LOG_DIR || DEFAULT_LOCAL_DIR;
let logDir = PREFERRED_DIR;

// Try to create and use the preferred directory, else fall back to repository-local logs
try {
  fs.mkdirSync(PREFERRED_DIR, { recursive: true });
  fs.accessSync(PREFERRED_DIR, fs.constants.W_OK);
} catch (err) {
  logDir = DEFAULT_LOCAL_DIR;
  try { fs.mkdirSync(logDir, { recursive: true }); } catch (e) { /* ignore */ }
}

const logFile = path.join(logDir, 'app.log');
let stream = null;
try {
  stream = fs.createWriteStream(logFile, { flags: 'a' });
  stream.on('error', (e) => {
    console.error('Logger stream error:', e && (e.stack || e.message));
    stream = null;
  });
} catch (e) {
  console.error('Cannot create log stream:', e && (e.stack || e.message));
  stream = null;
}

function formatArg(a) {
  if (a instanceof Error) return a.stack || a.message;
  if (typeof a === 'object') {
    try { return JSON.stringify(a); } catch (e) { return String(a); }
  }
  return String(a);
}

function writeToFile(level, args) {
  const msg = args.map(formatArg).join(' ');
  const line = `${new Date().toISOString()} [${level}] ${msg}\n`;
  if (stream) {
    try { stream.write(line); } catch (e) { /* ignore write errors */ }
  }
}

['log', 'info', 'warn', 'error', 'debug'].forEach((level) => {
  const original = console[level] || console.log;
  console[level] = function(...args) {
    try { if (stream) writeToFile(level.toUpperCase(), args); } catch (e) { /* ignore */ }
    original.apply(console, args);
  };
});

module.exports = { logFile, logDir };
