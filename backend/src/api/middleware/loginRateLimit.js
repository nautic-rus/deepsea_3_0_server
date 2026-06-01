/**
 * Lightweight in-memory rate limiter for authentication endpoints.
 *
 * Keeps separate counters per IP and per login identifier so password spray
 * attempts get throttled even when they vary usernames.
 */

const buckets = new Map();
const WINDOW_MS = Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000);
const MAX_ATTEMPTS_PER_IP = Number(process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS_PER_IP || 20);
const MAX_ATTEMPTS_PER_IDENTIFIER = Number(process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS_PER_IDENTIFIER || 8);

function now() {
  return Date.now();
}

function bucketKey(prefix, value) {
  return `${prefix}:${String(value || 'unknown').toLowerCase().trim()}`;
}

function getBucket(key) {
  const current = buckets.get(key);
  const ts = now();
  if (!current || current.resetAt <= ts) {
    const fresh = { count: 0, resetAt: ts + WINDOW_MS };
    buckets.set(key, fresh);
    return fresh;
  }
  return current;
}

function cleanup() {
  const ts = now();
  for (const [key, bucket] of buckets.entries()) {
    if (!bucket || bucket.resetAt <= ts) {
      buckets.delete(key);
    }
  }
}

setInterval(cleanup, WINDOW_MS).unref();

function loginRateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const body = req.body || {};
  const identifier = body.username || body.email || '';

  const ipBucket = getBucket(bucketKey('ip', ip));
  const idBucket = identifier ? getBucket(bucketKey('id', identifier)) : null;

  if (ipBucket.count >= MAX_ATTEMPTS_PER_IP) {
    return res.status(429).json({
      error: 'Too many login attempts from this IP. Please try again later.'
    });
  }

  if (idBucket && idBucket.count >= MAX_ATTEMPTS_PER_IDENTIFIER) {
    return res.status(429).json({
      error: 'Too many login attempts for this account. Please try again later.'
    });
  }

  res.on('finish', () => {
    // Count only failed or suspicious responses. Successful logins should not burn the quota.
    if (res.statusCode >= 400) {
      ipBucket.count += 1;
      if (idBucket) idBucket.count += 1;
    }
  });

  next();
}

module.exports = loginRateLimit;
