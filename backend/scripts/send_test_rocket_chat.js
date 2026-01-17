#!/usr/bin/env node
/*
 Simple test script to send a Rocket.Chat message using the project's RocketChatService.

 Usage:
  # Using CLI args
  node scripts/send_test_rocket_chat.js "#general" "Hello from test script"

  # Or using environment variables
  TEST_RC_CHANNEL="#general" TEST_RC_TEXT="Hello from env" node scripts/send_test_rocket_chat.js

 Notes:
 - Requires ROCKET_CHAT_URL and either ROCKET_CHAT_TOKEN+ROCKET_CHAT_USER_ID or ROCKET_CHAT_LOGIN+ROCKET_CHAT_PASSWORD to be set in the environment.
 - This script performs a real send when executed. Be careful in production environments.
*/

const path = require('path');
// Load environment from repository `env` file so scripts see same vars as server
require('dotenv').config({ path: path.join(__dirname, '..', 'env') });
const RocketChatService = require('../src/api/services/rocketChatService');

async function sendTest(channel, text) {
  if (!channel) throw new Error('channel is required');
  if (!text) throw new Error('text is required');
  console.log('Sending to', channel);
  const res = await RocketChatService.sendMessage({ channel, text });
  return res;
}

if (require.main === module) {
  (async () => {
    try {
      const argv = process.argv.slice(2);
      let channel = argv[0] || process.env.TEST_RC_CHANNEL;
      let text = argv.slice(1).join(' ') || process.env.TEST_RC_TEXT;

      if (!channel || !text) {
        console.error('Usage: node scripts/send_test_rocket_chat.js "<channel>" "<message>"');
        console.error('Or set TEST_RC_CHANNEL and TEST_RC_TEXT environment variables.');
        process.exit(2);
      }

      const result = await sendTest(channel, text);
      console.log('Result:', result);
      process.exit(0);
    } catch (err) {
      console.error('Error sending test message:', err && err.message ? err.message : err);
      process.exit(3);
    }
  })();
}

module.exports = { sendTest };
