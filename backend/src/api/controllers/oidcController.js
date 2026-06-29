const OidcService = require('../services/oidcService');

function oidcError(res, statusCode, error, description) {
  return res.status(statusCode).json({
    error,
    error_description: description
  });
}

function getFullRequestUrl(req) {
  const issuer = OidcService.getIssuerUrl(req);
  const originalUrl = req.originalUrl || req.url || '/';
  return `${issuer}${originalUrl}`;
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
      }

      const user = await OidcService.resolveAuthenticatedUser(req);
      if (!user) {
        const frontendUrl = String(process.env.FRONTEND_URL || '').trim();
        if (frontendUrl) {
          const loginUrl = new URL(frontendUrl);
          loginUrl.searchParams.set('return_to', getFullRequestUrl(req));
          loginUrl.searchParams.set('client_name', OidcService.getClientName());
          return res.redirect(302, loginUrl.toString());
        }
        throw OidcService.buildClientError(401, 'login_required', 'Authentication session is required');
      }

      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent') || '';
      const authCode = await OidcService.createAuthorizationCode({
        user,
        clientId: client_id,
        redirectUri: redirect_uri,
        codeChallenge: code_challenge,
        codeChallengeMethod: code_challenge_method,
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
