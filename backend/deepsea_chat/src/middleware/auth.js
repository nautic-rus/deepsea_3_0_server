const config = require('../config');

const authCache = new Map();
const AUTH_CACHE_TTL_MS = Math.max(1000, Number(process.env.CHAT_AUTH_CACHE_TTL_MS || 10000));

function buildCacheKey(req) {
  return `${req.headers.authorization || ''}\u0000${req.headers.cookie || ''}`;
}

function getCachedUser(cacheKey) {
  const entry = authCache.get(cacheKey);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    authCache.delete(cacheKey);
    return null;
  }
  return entry.user;
}

function setCachedUser(cacheKey, user) {
  authCache.set(cacheKey, {
    user,
    expiresAt: Date.now() + AUTH_CACHE_TTL_MS
  });
}

function pruneAuthCache() {
  if (authCache.size <= 200) return;
  const now = Date.now();
  for (const [key, entry] of authCache.entries()) {
    if (!entry || entry.expiresAt <= now) {
      authCache.delete(key);
    }
  }
}

async function authMiddleware(req, res, next) {
  try {
    pruneAuthCache();
    const cacheKey = buildCacheKey(req);
    const cachedUser = getCachedUser(cacheKey);
    if (cachedUser) {
      req.user = cachedUser;
      next();
      return;
    }

    const headers = {};
    if (req.headers.authorization) {
      headers.Authorization = req.headers.authorization;
    }
    if (req.headers.cookie) {
      headers.Cookie = req.headers.cookie;
    }

    const response = await fetch(`${config.authServiceUrl}/api/auth/me`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const payload = await response.json();
    const user = payload && payload.user ? payload.user : payload;
    if (!user || !user.id) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    setCachedUser(cacheKey, user);
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = authMiddleware;
