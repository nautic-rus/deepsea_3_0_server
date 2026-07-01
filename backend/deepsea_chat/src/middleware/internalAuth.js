const config = require('../config');

function internalAuth(req, res, next) {
  const expectedToken = config.internalToken;
  if (!expectedToken) {
    res.status(503).json({ error: 'Internal chat token is not configured' });
    return;
  }

  const providedToken = String(req.headers['x-deepsea-internal-token'] || '').trim();
  if (!providedToken || providedToken !== expectedToken) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}

module.exports = internalAuth;
