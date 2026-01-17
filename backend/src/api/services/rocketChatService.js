/**
 * Rocket.Chat notification service
 *
 * Uses Rocket.Chat REST API. The service will call /api/v1/chat.postMessage and
 * will obtain auth using /api/v1/login if ROCKET_CHAT_TOKEN/ROCKET_CHAT_USER_ID
 * are not provided.
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

class RocketChatService {
  /**
   * Send a message to Rocket.Chat.
   * options: { channel, text, alias, emoji, avatar }
   * Returns an object { success: boolean, statusCode, body }
   */
  static async sendMessage(options = {}) {
    const baseUrl = process.env.ROCKET_CHAT_URL;
    if (!baseUrl) {
      throw new Error('Rocket.Chat not configured: set ROCKET_CHAT_URL and either ROCKET_CHAT_TOKEN+ROCKET_CHAT_USER_ID or ROCKET_CHAT_LOGIN+ROCKET_CHAT_PASSWORD');
    }

    return this._sendViaRest(baseUrl, options);
  }

  static _postJson(urlString, data, headers = {}) {
    return new Promise((resolve, reject) => {
      try {
        const url = new URL(urlString);
        const payload = JSON.stringify(data);

        const isHttps = url.protocol === 'https:';
        const port = url.port || (isHttps ? 443 : 80);

        const opts = {
          hostname: url.hostname,
          port: port,
          path: url.pathname + (url.search || ''),
          method: 'POST',
          headers: Object.assign({
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          }, headers)
        };

        const req = (isHttps ? https : http).request(opts, (res) => {
          let body = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            let parsed = body;
            try { parsed = JSON.parse(body); } catch (e) { /* keep raw */ }
            resolve({ success: res.statusCode >= 200 && res.statusCode < 300, statusCode: res.statusCode, body: parsed });
          });
        });

        req.on('error', (err) => reject(err));
        req.write(payload);
        req.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  static async _sendViaWebhook(webhookUrl, options) {
    // removed: webhook support is no longer available in this service
    throw new Error('Webhook support removed — use REST API via ROCKET_CHAT_URL');
  }

  static async _sendViaRest(baseUrl, options) {
    // Ensure we have an auth token and user id (either from env or by logging in)
    const { token, userId } = await this._ensureAuth(baseUrl);

    const url = `${baseUrl.replace(/\/$/, '')}/api/v1/chat.postMessage`;

    const body = {
      channel: options.channel,
      text: options.text
    };

    if (options.alias) body.alias = options.alias;
    if (options.avatar) body.avatar = options.avatar;
    if (options.emoji) body.emoji = options.emoji;

    const headers = {
      'X-Auth-Token': token,
      'X-User-Id': userId
    };

    return this._postJson(url, body, headers);
  }
  
  // Ensure we have auth token and user id (either from env or by logging in)
  static async _ensureAuth(baseUrl) {
    // Prefer explicit env vars if provided
    if (process.env.ROCKET_CHAT_TOKEN && process.env.ROCKET_CHAT_USER_ID) {
      return { token: process.env.ROCKET_CHAT_TOKEN, userId: process.env.ROCKET_CHAT_USER_ID };
    }

    // If previously cached, return it
    if (RocketChatService._cachedAuth && RocketChatService._cachedAuth.baseUrl === baseUrl && RocketChatService._cachedAuth.token && RocketChatService._cachedAuth.userId) {
      return { token: RocketChatService._cachedAuth.token, userId: RocketChatService._cachedAuth.userId };
    }

    // Otherwise try to login using credentials from env
    const login = process.env.ROCKET_CHAT_LOGIN;
    const password = process.env.ROCKET_CHAT_PASSWORD;

    if (!login || !password) {
      throw new Error('Rocket.Chat REST API requires either ROCKET_CHAT_TOKEN+ROCKET_CHAT_USER_ID or ROCKET_CHAT_LOGIN+ROCKET_CHAT_PASSWORD');
    }

    const url = `${baseUrl.replace(/\/$/, '')}/api/v1/login`;
    const resp = await this._postJson(url, { user: login, password });

    if (!resp || !resp.success || !resp.body || !resp.body.data) {
      throw new Error(`Rocket.Chat login failed: ${JSON.stringify(resp && resp.body)}`);
    }

    const authToken = resp.body.data.authToken || (resp.body && resp.body.data && resp.body.data.authToken);
    const userId = resp.body.data.userId || (resp.body && resp.body.data && resp.body.data.userId);

    if (!authToken || !userId) {
      throw new Error(`Rocket.Chat login response missing authToken/userId: ${JSON.stringify(resp.body)}`);
    }

    // Cache for this baseUrl
    RocketChatService._cachedAuth = { baseUrl: baseUrl.replace(/\/$/, ''), token: authToken, userId };

    return { token: authToken, userId };
  }
}

// Cache auth in-memory for the process lifetime
RocketChatService._cachedAuth = null;

module.exports = RocketChatService;
