const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const User = require('../../db/models/User');
const Session = require('../../db/models/Session');
const OidcAuthorizationCode = require('../../db/models/OidcAuthorizationCode');
const { verifyAccessToken } = require('../../utils/jwt');

const SUPPORTED_SCOPES = new Set(['openid', 'profile', 'email', 'offline_access']);

function normalizeBaseUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw.replace(/\/+$/, '');
}

function normalizePem(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw.includes('\\n') ? raw.replace(/\\n/g, '\n') : raw;
}

function getIssuerUrl(req) {
  const configured = normalizeBaseUrl(process.env.OIDC_ISSUER_URL || '');
  if (configured) return configured;

  if (req && typeof req.protocol === 'string' && typeof req.get === 'function') {
    const host = req.get('host');
    if (host) {
      return `${req.protocol}://${host}`.replace(/\/+$/, '');
    }
  }

  const fallbackHost = String(process.env.HOST || 'localhost').trim() || 'localhost';
  const fallbackPort = String(process.env.PORT || '3000').trim();
  const protocol = String(process.env.NODE_ENV || '').toLowerCase() === 'production' ? 'https' : 'http';
  return `${protocol}://${fallbackHost}:${fallbackPort}`.replace(/\/+$/, '');
}

function getClientId() {
  return String(process.env.OIDC_CLIENT_ID || 'matrix').trim() || 'matrix';
}

function getClientName() {
  return String(process.env.OIDC_CLIENT_NAME || 'Matrix').trim() || 'Matrix';
}

function getSigningKid() {
  return String(process.env.OIDC_SIGNING_KID || 'deepsea-oidc').trim() || 'deepsea-oidc';
}

function getSigningPrivateKey() {
  const key = normalizePem(process.env.OIDC_PRIVATE_KEY_PEM);
  if (!key) {
    const err = new Error('OIDC_PRIVATE_KEY_PEM is not configured');
    err.statusCode = 500;
    throw err;
  }
  return key;
}

function getSigningPublicKey() {
  const privateKey = crypto.createPrivateKey(getSigningPrivateKey());
  return crypto.createPublicKey(privateKey);
}

function getPublicJwks() {
  const publicKey = getSigningPublicKey();
  const jwk = publicKey.export({ format: 'jwk' });

  return {
    keys: [{
      ...jwk,
      use: 'sig',
      alg: 'RS256',
      kid: getSigningKid()
    }]
  };
}

function parseDurationToSeconds(raw, fallbackSeconds) {
  const value = String(raw || '').trim();
  const match = value.match(/^(\d+)([smhd])$/i);
  if (!match) return fallbackSeconds;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  switch (unit) {
    case 's': return amount;
    case 'm': return amount * 60;
    case 'h': return amount * 60 * 60;
    case 'd': return amount * 24 * 60 * 60;
    default: return fallbackSeconds;
  }
}

function getAuthCodeTtlSeconds() {
  return parseDurationToSeconds(process.env.OIDC_AUTH_CODE_EXPIRES_IN || '5m', 300);
}

function getAccessTokenTtlSeconds() {
  return parseDurationToSeconds(process.env.OIDC_ACCESS_TOKEN_EXPIRES_IN || '15m', 900);
}

function getAllowedRedirectUris() {
  const raw = String(process.env.OIDC_REDIRECT_URIS || '').trim();
  if (!raw) return [];
  return raw
    .split(/[\n,]/g)
    .map((item) => item.trim())
    .filter(Boolean)
    .map(normalizeBaseUrl);
}

function isPkceRequired() {
  const raw = String(process.env.OIDC_REQUIRE_PKCE || '').trim().toLowerCase();
  if (['false', '0', 'no', 'off'].includes(raw)) return false;
  return true;
}

function buildEndpointUrl(req, path) {
  const issuer = getIssuerUrl(req);
  return `${issuer}${path}`;
}

function hashCode(code) {
  return crypto.createHash('sha256').update(String(code || ''), 'utf8').digest('base64url');
}

function generateCode() {
  return crypto.randomBytes(32).toString('base64url');
}

function generateOpaqueToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function normalizeScope(scope) {
  return String(scope || '')
    .trim()
    .split(/\s+/g)
    .filter(Boolean)
    .filter((item) => SUPPORTED_SCOPES.has(item));
}

function buildDisplayName(user) {
  const parts = [user.first_name, user.last_name].map((part) => String(part || '').trim()).filter(Boolean);
  if (parts.length) return parts.join(' ');
  return user.username || user.email || `user-${user.id}`;
}

function buildUserClaims(user) {
  const name = buildDisplayName(user);
  return {
    sub: `user:${user.id}`,
    preferred_username: user.username || null,
    name,
    given_name: user.first_name || null,
    family_name: user.last_name || null,
    email: user.email || null,
    email_verified: !!user.is_verified
  };
}

async function resolveAuthenticatedUser(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.access_token) {
    token = req.cookies.access_token;
  }

  if (!token) return null;

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (error) {
    return null;
  }

  if (!payload || !payload.id) return null;

  const user = await User.findById(payload.id);
  if (!user || !user.is_active) return null;

  const session = await Session.findByToken(token);
  if (!session || session.user_id !== user.id) return null;

  return user;
}

function isAllowedRedirectUri(redirectUri) {
  const allowed = getAllowedRedirectUris();
  if (allowed.length === 0) return false;
  const normalized = normalizeBaseUrl(redirectUri);
  return allowed.includes(normalized);
}

function buildDiscoveryDocument(req) {
  const issuer = getIssuerUrl(req);
  return {
    issuer,
    authorization_endpoint: `${issuer}/oidc/authorize`,
    token_endpoint: `${issuer}/oidc/token`,
    userinfo_endpoint: `${issuer}/oidc/userinfo`,
    jwks_uri: `${issuer}/oidc/jwks.json`,
    response_types_supported: ['code'],
    response_modes_supported: ['query'],
    grant_types_supported: ['authorization_code'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256'],
    scopes_supported: ['openid', 'profile', 'email', 'offline_access'],
    claims_supported: [
      'sub',
      'name',
      'given_name',
      'family_name',
      'preferred_username',
      'email',
      'email_verified',
      'nonce',
      'auth_time'
    ],
    token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post', 'none'],
    end_session_endpoint: `${issuer}/oidc/logout`
  };
}

function buildAuthorizeRedirectUrl(redirectUri, params) {
  const url = new URL(redirectUri);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

function buildClientError(statusCode, error, description) {
  const err = new Error(description || error);
  err.statusCode = statusCode;
  err.oidcError = error;
  err.oidcDescription = description || error;
  return err;
}

function signJwtToken(claims) {
  const privateKey = getSigningPrivateKey();
  return jwt.sign(claims, privateKey, {
    algorithm: 'RS256',
    keyid: getSigningKid(),
    noTimestamp: true
  });
}

async function createAuthorizationCode({
  user,
  clientId,
  redirectUri,
  codeChallenge,
  codeChallengeMethod,
  nonce,
  scope,
  issuer,
  ipAddress,
  userAgent
}) {
  const code = generateCode();
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + getAuthCodeTtlSeconds() * 1000);
  const authTime = new Date();

  await OidcAuthorizationCode.create({
    code_hash: codeHash,
    user_id: user.id,
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: codeChallengeMethod,
    nonce,
    scope,
    issuer,
    auth_time: authTime,
    expires_at: expiresAt,
    ip_address: ipAddress,
    user_agent: userAgent
  });

  return {
    code,
    codeHash,
    expiresAt,
    authTime
  };
}

function verifyPkce(codeVerifier, storedChallenge, method) {
  if (!storedChallenge) return true;
  const normalizedMethod = String(method || 'S256').toUpperCase();
  if (normalizedMethod !== 'S256') return false;
  if (!codeVerifier) return false;
  const derivedChallenge = crypto
    .createHash('sha256')
    .update(String(codeVerifier), 'utf8')
    .digest('base64url');
  return derivedChallenge === storedChallenge;
}

async function exchangeAuthorizationCode({ code, clientId, redirectUri, codeVerifier }) {
  if (!code) {
    throw buildClientError(400, 'invalid_request', 'code is required');
  }
  if (!clientId) {
    throw buildClientError(400, 'invalid_request', 'client_id is required');
  }
  if (!redirectUri) {
    throw buildClientError(400, 'invalid_request', 'redirect_uri is required');
  }

  const codeHash = hashCode(code);

  return OidcAuthorizationCode._runInTransaction(async (client) => {
    const row = await OidcAuthorizationCode.findByCodeHash(codeHash, client, true);
    if (!row) {
      throw buildClientError(400, 'invalid_grant', 'authorization code is invalid or expired');
    }
    if (row.consumed_at) {
      throw buildClientError(400, 'invalid_grant', 'authorization code has already been used');
    }
    if (row.client_id !== clientId) {
      throw buildClientError(400, 'invalid_grant', 'authorization code was issued for a different client');
    }
    if (normalizeBaseUrl(row.redirect_uri) !== normalizeBaseUrl(redirectUri)) {
      throw buildClientError(400, 'invalid_grant', 'redirect_uri does not match the authorization request');
    }
    if (new Date(row.expires_at).getTime() <= Date.now()) {
      throw buildClientError(400, 'invalid_grant', 'authorization code has expired');
    }
    if (!verifyPkce(codeVerifier, row.code_challenge, row.code_challenge_method)) {
      throw buildClientError(400, 'invalid_grant', 'code_verifier is invalid');
    }

    const consumed = await OidcAuthorizationCode.consumeByCodeHash(codeHash, client);
    if (!consumed) {
      throw buildClientError(400, 'invalid_grant', 'authorization code has already been used');
    }

    const user = await User.findById(row.user_id);
    if (!user || !user.is_active) {
      throw buildClientError(400, 'invalid_grant', 'user account is not active');
    }

    const issuer = row.issuer || getIssuerUrl();
    const now = Math.floor(Date.now() / 1000);
    const accessTokenTtl = getAccessTokenTtlSeconds();
    const claims = buildUserClaims(user);
    const accessTokenClaims = {
      iss: issuer,
      aud: clientId,
      sub: claims.sub,
      scope: row.scope || 'openid',
      iat: now,
      exp: now + accessTokenTtl,
      auth_time: Math.floor(new Date(row.auth_time || new Date()).getTime() / 1000),
      jti: generateOpaqueToken()
    };

    const idTokenClaims = {
      iss: issuer,
      aud: clientId,
      sub: claims.sub,
      iat: now,
      exp: now + accessTokenTtl,
      auth_time: accessTokenClaims.auth_time,
      nonce: row.nonce || undefined,
      ...claims
    };

    const access_token = signJwtToken(accessTokenClaims, accessTokenTtl);
    const id_token = signJwtToken(idTokenClaims, accessTokenTtl);

    return {
      user,
      row,
      access_token,
      id_token,
      expires_in: accessTokenTtl,
      scope: row.scope || 'openid'
    };
  });
}

async function buildUserInfo(accessToken) {
  const publicKey = getSigningPublicKey();
  const decodedClaims = jwt.decode(accessToken) || {};
  const decoded = jwt.verify(accessToken, publicKey, {
    algorithms: ['RS256'],
    issuer: decodedClaims.iss || getIssuerUrl(),
    audience: decodedClaims.aud || getClientId()
  });

  const sub = String(decoded.sub || '');
  const userIdMatch = sub.match(/^user:(\d+)$/);
  if (!userIdMatch) {
    throw buildClientError(401, 'invalid_token', 'token subject is invalid');
  }

  const user = await User.findById(Number(userIdMatch[1]));
  if (!user || !user.is_active) {
    throw buildClientError(401, 'invalid_token', 'user is inactive or missing');
  }

  return {
    sub: `user:${user.id}`,
    ...buildUserClaims(user)
  };
}

async function validateClientCredentials(req, clientId) {
  const configuredClientId = getClientId();
  if (clientId !== configuredClientId) {
    throw buildClientError(400, 'invalid_client', 'client_id is not recognized');
  }

  const expectedSecret = String(process.env.OIDC_CLIENT_SECRET || '').trim();
  if (!expectedSecret) return true;

  const authHeader = req.headers.authorization || req.headers.Authorization;
  let providedSecret = null;
  if (authHeader && authHeader.startsWith('Basic ')) {
    const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
    const sep = decoded.indexOf(':');
    if (sep >= 0) {
      const basicClientId = decoded.slice(0, sep);
      const basicSecret = decoded.slice(sep + 1);
      if (basicClientId !== clientId || basicSecret !== expectedSecret) {
        throw buildClientError(401, 'invalid_client', 'client authentication failed');
      }
      return true;
    }
  }

  if (req.body && typeof req.body.client_secret === 'string') {
    providedSecret = req.body.client_secret;
  }

  if (providedSecret !== expectedSecret) {
    throw buildClientError(401, 'invalid_client', 'client authentication failed');
  }

  return true;
}

module.exports = {
  getIssuerUrl,
  getClientId,
  getClientName,
  getSigningKid,
  getPublicJwks,
  getAuthCodeTtlSeconds,
  getAccessTokenTtlSeconds,
  getAllowedRedirectUris,
  isPkceRequired,
  buildDiscoveryDocument,
  buildAuthorizeRedirectUrl,
  buildClientError,
  normalizeScope,
  normalizeBaseUrl,
  resolveAuthenticatedUser,
  isAllowedRedirectUri,
  createAuthorizationCode,
  exchangeAuthorizationCode,
  buildUserClaims,
  buildUserInfo,
  validateClientCredentials,
  hashCode,
  generateCode,
  signJwtToken,
  getSigningPrivateKey,
  getSigningPublicKey
};
