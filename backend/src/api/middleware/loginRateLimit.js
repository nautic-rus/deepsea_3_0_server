/**
 * Lightweight in-memory rate limiter for login attempts.
 *
 * Throttles by IP and by login identifier to slow brute-force and password-spray
 * attacks without adding a new dependency.
 */

const buckets = new Map();

function readLimit(name, fallback) {
  const raw = process.env[name];
  const value = raw === undefined || raw === null || raw === '' ? fallback : Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function bucketKey(prefix, value) {
  return `${prefix}:${String(value || 'unknown').toLowerCase().trim()}`;
}

function getBucket(key, windowMs) {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now || current.windowMs !== windowMs) {
    const fresh = { count: 0, resetAt: now + windowMs, windowMs };
    buckets.set(key, fresh);
    return fresh;
  }
  return current;
}

function cleanupBuckets() {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (!bucket || bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

setInterval(cleanupBuckets, 60 * 1000).unref();

function loginRateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const body = req.body || {};
  const identifier = body.username || body.email || '';
  const windowMs = readLimit('LOGIN_RATE_LIMIT_WINDOW_MS', 10 * 60 * 1000);
  const maxAttemptsPerIp = readLimit('LOGIN_RATE_LIMIT_MAX_ATTEMPTS_PER_IP', 20);
  const maxAttemptsPerIdentifier = readLimit('LOGIN_RATE_LIMIT_MAX_ATTEMPTS_PER_IDENTIFIER', 8);

  const ipBucket = getBucket(bucketKey('ip', ip), windowMs);
  const idBucket = identifier ? getBucket(bucketKey('id', identifier), windowMs) : null;

  if (ipBucket.count >= maxAttemptsPerIp) {
    return res.status(429).json({
      error: 'Too many login attempts from this IP. Please try again later.'
    });
  }

  if (idBucket && idBucket.count >= maxAttemptsPerIdentifier) {
    return res.status(429).json({
      error: 'Too many login attempts for this account. Please try again later.'
    });
  }

  res.on('finish', () => {
    if (res.statusCode === 400 || res.statusCode === 401 || res.statusCode === 403) {
      ipBucket.count += 1;
      if (idBucket) idBucket.count += 1;
    }
  });

  next();
}

module.exports = loginRateLimit;
