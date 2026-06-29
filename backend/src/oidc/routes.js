const express = require('express');
const router = express.Router();

const OidcController = require('../api/controllers/oidcController');

router.get('/.well-known/openid-configuration', OidcController.discovery);
router.get('/.well-known/oauth-authorization-server', OidcController.discovery);
router.get('/oidc/jwks.json', OidcController.jwks);
router.get('/oidc/authorize', OidcController.authorize);
router.get('/oidc/login', OidcController.loginPage);
router.post('/oidc/login', OidcController.loginSubmit);
router.post('/oidc/token', OidcController.token);
router.get('/oidc/userinfo', OidcController.userinfo);
router.post('/oidc/logout', OidcController.logout);
router.get('/oidc/logout', OidcController.logout);

module.exports = router;
