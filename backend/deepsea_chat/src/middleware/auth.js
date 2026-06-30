const config = require('../config');

async function authMiddleware(req, res, next) {
  try {
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

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = authMiddleware;
