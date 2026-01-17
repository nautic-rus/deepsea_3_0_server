#!/usr/bin/env node
// Diagnostic script to inspect notification-related DB rows

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'env') });
const pool = require('../src/db/connection');

async function run() {
  try {
    console.log('DB config from env:', {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER
    });

    const eventCode = 'issue_created';
    const methodCode = 'rocket_chat';
    const projectIdSample = process.argv[2] ? Number(process.argv[2]) : null;

    const evRes = await pool.query('SELECT * FROM public.notification_events WHERE code = $1', [eventCode]);
    console.log('\nnotification_events rows for', eventCode, evRes.rows);

    const mRes = await pool.query('SELECT * FROM public.notification_methods WHERE code = $1', [methodCode]);
    console.log('\nnotification_methods rows for', methodCode, mRes.rows);

    if (evRes.rows.length === 0) {
      console.warn('\nNo event row found for', eventCode);
    }
    if (mRes.rows.length === 0) {
      console.warn('\nNo method row found for', methodCode);
    }

    // If a project id supplied, filter by it; otherwise show some sample enabled settings for the event
    const eventId = evRes.rows[0] ? evRes.rows[0].id : null;
    if (!eventId) {
      console.log('\nSkipping user settings check since event not found');
      process.exit(0);
    }

    const q = `SELECT uns.*, nm.code as method_code, urc.rc_username, urc.rc_user_id, u.email
      FROM public.user_notification_settings uns
      JOIN public.notification_methods nm ON nm.id = uns.method_id
      LEFT JOIN public.user_rocket_chat urc ON urc.user_id = uns.user_id
      LEFT JOIN public.users u ON u.id = uns.user_id
      WHERE uns.enabled = true AND uns.event_id = $1` + (projectIdSample ? ' AND (uns.project_id IS NULL OR uns.project_id = $2)' : '');

    const params = projectIdSample ? [eventId, projectIdSample] : [eventId];
    const r = await pool.query(q, params);
    console.log(`\nEnabled user_notification_settings for event id ${eventId}${projectIdSample ? ' (project ' + projectIdSample + ')' : ''}:`);
    console.table(r.rows);

    // Show user_rocket_chat rows for users found
    const userIds = r.rows.map(rr => rr.user_id).filter(Boolean);
    if (userIds.length > 0) {
      const urc = await pool.query(`SELECT * FROM public.user_rocket_chat WHERE user_id = ANY($1::int[])`, [userIds]);
      console.log('\nuser_rocket_chat mappings for these users:');
      console.table(urc.rows);
    } else {
      console.log('\nNo subscribed users found for this event');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error inspecting notification config:', err && err.stack ? err.stack : err);
    process.exit(2);
  }
}

if (require.main === module) run();

module.exports = { run };
