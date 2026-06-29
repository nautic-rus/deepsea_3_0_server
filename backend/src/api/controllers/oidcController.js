const AuthService = require('../services/authService');
const OidcService = require('../services/oidcService');

function oidcError(res, statusCode, error, description) {
  return res.status(statusCode).json({
    error,
    error_description: description
  });
}

function getFullRequestUrl(req) {
  const issuer = OidcService.getIssuerUrl(req);
  const originalUrl = String(req.originalUrl || req.url || '/');
  const relativeUrl = originalUrl.startsWith('/api/')
    ? originalUrl.slice(4)
    : (originalUrl === '/api' ? '/' : originalUrl);
  return `${issuer}${relativeUrl}`;
}

function setTokenCookieMaxAge(rawValue, fallback = null) {
  const raw = String(rawValue || '').trim();
  if (raw.endsWith('d')) return parseInt(raw, 10) * 24 * 60 * 60 * 1000;
  if (raw.endsWith('h')) return parseInt(raw, 10) * 60 * 60 * 1000;
  if (raw.endsWith('m')) return parseInt(raw, 10) * 60 * 1000;
  if (raw.endsWith('s')) return parseInt(raw, 10) * 1000;
  return fallback;
}

function setAuthCookies(res, result) {
  const refreshMaxAge = setTokenCookieMaxAge(process.env.REFRESH_TOKEN_EXPIRES_IN || '7d');
  const accessMaxAge = setTokenCookieMaxAge(process.env.JWT_EXPIRES_IN || '24h');

  res.cookie('refresh_token', result.refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: refreshMaxAge
  });

  res.cookie('access_token', result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: accessMaxAge
  });
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderLoginPage({ returnTo, errorMessage, clientName }) {
  const safeReturnTo = escapeHtml(returnTo || '');
  const safeError = errorMessage ? `<div class="error">${escapeHtml(errorMessage)}</div>` : '';
  const safeClientName = escapeHtml(clientName || 'Matrix');

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>DeepSea OIDC Login</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: linear-gradient(160deg, #06101d, #0b1730 60%, #09111f);
      color: #f3f7ff;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .card {
      width: min(100%, 420px);
      margin: 24px;
      padding: 28px;
      border-radius: 20px;
      background: rgba(10, 20, 35, 0.92);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 18px 70px rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(12px);
    }
    h1 { margin: 0 0 8px; font-size: 26px; }
    p { margin: 0 0 20px; color: #a8b7d0; line-height: 1.5; }
    label { display: block; margin: 14px 0 6px; font-size: 14px; color: #a8b7d0; }
    input {
      width: 100%;
      box-sizing: border-box;
      padding: 12px 14px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.04);
      color: #f3f7ff;
      outline: none;
    }
    button {
      width: 100%;
      margin-top: 20px;
      border: 0;
      border-radius: 12px;
      padding: 13px 16px;
      background: linear-gradient(135deg, #77b8ff, #4f86ff);
      color: white;
      font-weight: 700;
      cursor: pointer;
    }
    .error {
      margin-bottom: 16px;
      padding: 12px 14px;
      border-radius: 12px;
      background: rgba(255, 123, 123, 0.12);
      color: #ff7b7b;
      border: 1px solid rgba(255, 123, 123, 0.22);
    }
  </style>
</head>
<body>
  <main class="card">
    <h1>Вход для ${safeClientName}</h1>
    <p>Авторизуйтесь в DeepSea, чтобы продолжить вход в Matrix.</p>
    ${safeError}
    <form method="post" action="/api/oidc/login">
      <input type="hidden" name="return_to" value="${safeReturnTo}" />
      <label for="username">Логин или email</label>
      <input id="username" name="username" autocomplete="username" required />
      <label for="password">Пароль</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required />
      <button type="submit">Продолжить</button>
    </form>
  </main>
</body>
</html>`;
}

function sanitizeReturnTo(returnTo, req) {
  if (!returnTo) return null;
  try {
    const issuer = OidcService.getIssuerUrl(req);
    const parsed = new URL(returnTo, issuer);
    if (`${parsed.protocol}//${parsed.host}` !== issuer) return null;
    if (parsed.pathname !== '/api/oidc/authorize') return null;
    return parsed.toString();
  } catch (error) {
    return null;
  }
}

class OidcController {
  static async discovery(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.json(OidcService.buildDiscoveryDocument(req));
  }

  static async jwks(req, res) {
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json(OidcService.getPublicJwks());
  }

  static async authorize(req, res, next) {
    try {
      const {
        response_type,
        client_id,
        redirect_uri,
        scope,
        state,
        nonce,
        code_challenge,
        code_challenge_method,
        prompt
      } = req.query || {};

      if (response_type !== 'code') {
        throw OidcService.buildClientError(400, 'unsupported_response_type', 'Only response_type=code is supported');
      }

      const configuredClientId = OidcService.getClientId();
      if (client_id !== configuredClientId) {
        throw OidcService.buildClientError(400, 'invalid_client', 'client_id is not recognized');
      }

      if (!redirect_uri || !OidcService.isAllowedRedirectUri(redirect_uri)) {
        throw OidcService.buildClientError(400, 'invalid_request', 'redirect_uri is not allowed');
      }

      const requestedScopes = OidcService.normalizeScope(scope);
      if (!requestedScopes.includes('openid')) {
        throw OidcService.buildClientError(400, 'invalid_scope', 'openid scope is required');
      }
      if (requestedScopes.some((item) => !['openid', 'profile', 'email', 'offline_access'].includes(item))) {
        throw OidcService.buildClientError(400, 'invalid_scope', 'unsupported scope requested');
      }

      if (OidcService.isPkceRequired()) {
        if (!code_challenge || String(code_challenge_method || '').toUpperCase() !== 'S256') {
          throw OidcService.buildClientError(400, 'invalid_request', 'PKCE with code_challenge_method=S256 is required');
        }
      } else if (code_challenge && String(code_challenge_method || '').toUpperCase() !== 'S256') {
        throw OidcService.buildClientError(400, 'invalid_request', 'Unsupported code_challenge_method');
      }

      const user = await OidcService.resolveAuthenticatedUser(req);
      if (!user) {
        const loginUrl = new URL('/api/oidc/login', OidcService.getIssuerUrl(req));
        loginUrl.searchParams.set('return_to', getFullRequestUrl(req));
        loginUrl.searchParams.set('client_name', OidcService.getClientName());
        return res.redirect(302, loginUrl.toString());
      }

      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent') || '';
      const authCode = await OidcService.createAuthorizationCode({
        user,
        clientId: client_id,
        redirectUri: redirect_uri,
        codeChallenge: code_challenge || null,
        codeChallengeMethod: code_challenge_method || null,
        nonce,
        scope: requestedScopes.join(' '),
        issuer: OidcService.getIssuerUrl(req),
        ipAddress,
        userAgent
      });

      const redirectUrl = OidcService.buildAuthorizeRedirectUrl(redirect_uri, {
        code: authCode.code,
        state: state || undefined
      });

      return res.redirect(302, redirectUrl);
    } catch (error) {
      if (error && error.oidcError) {
        const redirectUri = req.query && req.query.redirect_uri;
        const state = req.query && req.query.state;
        if (redirectUri && OidcService.isAllowedRedirectUri(redirectUri)) {
          const url = new URL(redirectUri);
          url.searchParams.set('error', error.oidcError);
          if (error.oidcDescription) url.searchParams.set('error_description', error.oidcDescription);
          if (state) url.searchParams.set('state', String(state));
          return res.redirect(302, url.toString());
        }
        return oidcError(res, error.statusCode || 400, error.oidcError, error.oidcDescription);
      }
      next(error);
    }
  }

  static async loginPage(req, res) {
    const returnTo = sanitizeReturnTo(req.query && req.query.return_to, req) || '';
    const user = await OidcService.resolveAuthenticatedUser(req).catch(() => null);
    if (user && returnTo) {
      return res.redirect(302, returnTo);
    }

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(renderLoginPage({
      returnTo,
      errorMessage: req.query && req.query.error ? String(req.query.error_description || req.query.error) : '',
      clientName: req.query && req.query.client_name ? String(req.query.client_name) : OidcService.getClientName()
    }));
  }

  static async loginSubmit(req, res, next) {
    try {
      const { username, email, password, return_to } = req.body || {};
      const identifier = (username || email || '').toString().trim().toLowerCase();
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent') || '';
      const result = await AuthService.login(identifier, password, ipAddress, userAgent);
      setAuthCookies(res, result);

      const safeReturnTo = sanitizeReturnTo(return_to, req) || OidcService.getIssuerUrl(req);
      return res.redirect(302, safeReturnTo);
    } catch (error) {
      return res.status(401).send(renderLoginPage({
        returnTo: sanitizeReturnTo(req.body && req.body.return_to, req) || '',
        errorMessage: error && error.message ? error.message : 'Authentication failed',
        clientName: OidcService.getClientName()
      }));
    }
  }

  static async token(req, res, next) {
    try {
      const grantType = String((req.body && req.body.grant_type) || '').trim();
      if (grantType !== 'authorization_code') {
        return oidcError(res, 400, 'unsupported_grant_type', 'Only authorization_code grant is supported');
      }

      const clientId = String((req.body && req.body.client_id) || '').trim();
      const code = String((req.body && req.body.code) || '').trim();
      const redirectUri = String((req.body && req.body.redirect_uri) || '').trim();
      const codeVerifier = String((req.body && req.body.code_verifier) || '').trim();

      await OidcService.validateClientCredentials(req, clientId);
      const tokenResult = await OidcService.exchangeAuthorizationCode({
        code,
        clientId,
        redirectUri,
        codeVerifier
      });

      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({
        access_token: tokenResult.access_token,
        id_token: tokenResult.id_token,
        token_type: 'Bearer',
        expires_in: tokenResult.expires_in,
        scope: tokenResult.scope
      });
    } catch (error) {
      if (error && error.oidcError) {
        return oidcError(res, error.statusCode || 400, error.oidcError, error.oidcDescription);
      }
      next(error);
    }
  }

  static async userinfo(req, res, next) {
    try {
      const authHeader = req.headers.authorization || req.headers.Authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return oidcError(res, 401, 'invalid_token', 'Bearer access token is required');
      }
      const accessToken = authHeader.split(' ')[1];
      const userInfo = await OidcService.buildUserInfo(accessToken);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(userInfo);
    } catch (error) {
      if (error && error.oidcError) {
        return oidcError(res, error.statusCode || 401, error.oidcError, error.oidcDescription);
      }
      next(error);
    }
  }

  static async logout(req, res, next) {
    try {
      try {
        res.clearCookie('access_token');
        res.clearCookie('refresh_token');
      } catch (error) {
        // ignore
      }
      const postLogout = req.query && req.query.post_logout_redirect_uri
        ? sanitizeReturnTo(req.query.post_logout_redirect_uri, req)
        : null;
      if (postLogout) {
        return res.redirect(302, postLogout);
      }
      return res.status(200).json({ message: 'Logged out' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = OidcController;
