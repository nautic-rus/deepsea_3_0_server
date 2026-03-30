#!/usr/bin/env node

// Diagnostic script: check why /api/user/pages returns no pages for a user
// Usage: node scripts/check_user_pages.js <userId>

const path = require('path');
const userId = process.argv[2] ? Number(process.argv[2]) : 1645;
if (!userId) {
  console.error('Provide a numeric userId as first argument');
  process.exit(2);
}

// Load project modules (paths relative to repo root -> scripts/)
const Page = require('../backend/src/db/models/Page');
const Permission = require('../backend/src/db/models/Permission');
const permissionChecker = require('../backend/src/api/services/permissionChecker');
const pool = require('../backend/src/db/connection');

async function main() {
  console.log(`Diagnostic for userId=${userId}`);

  // 1) list raw pages with aggregated permissions
  const rows = await Page.listAllWithPermissions();
  console.log(`Total pages in DB: ${rows.length}`);

  // If there are zero rows, the issue is DB side
  if (!rows || rows.length === 0) {
    console.log('No pages found in pages table. Check database migrations and content.');
    await pool.end();
    return;
  }

  // 2) show pages that have empty permissions arrays
  const pagesWithNoPerms = rows.filter(r => !r.permissions || (Array.isArray(r.permissions) && r.permissions.length === 0));
  console.log(`Pages with no permissions assigned: ${pagesWithNoPerms.length}`);
  if (pagesWithNoPerms.length) {
    console.log('Sample (first 10):');
    pagesWithNoPerms.slice(0, 10).forEach(p => console.log(` - id=${p.id} key=${p.key} path=${p.path}`));
  }

  // 3) For each page, check whether any of its permission codes is granted to the user
  const deniedPages = [];
  const allowedPages = [];
  for (const p of rows) {
    const perms = Array.isArray(p.permissions) ? p.permissions.map(x => (x && x.code) ? x.code : x) : [];
    // normalize
    const codes = perms.map(c => c && String(c).trim()).filter(Boolean);
    if (p.status === false) {
      // page disabled
      continue;
    }
    if (!codes || codes.length === 0) {
      // will be denied by service default
      deniedPages.push({ id: p.id, key: p.key, reason: 'no_permissions', codes: [] });
      continue;
    }
    let allowed = false;
    for (const code of codes) {
      // call permissionChecker.hasPermission with minimal actor object
      const ok = await permissionChecker.hasPermission({ id: userId }, code);
      if (ok) { allowed = true; break; }
    }
    if (!allowed) deniedPages.push({ id: p.id, key: p.key, reason: 'no_matching_perms', codes });
    else allowedPages.push({ id: p.id, key: p.key, codes });
  }

  console.log(`Pages denied for user ${userId}: ${deniedPages.length} / ${rows.length}`);
  if (deniedPages.length) {
    console.log('Sample denied pages (first 20):');
    deniedPages.slice(0, 20).forEach(d => console.log(` - id=${d.id} key=${d.key} reason=${d.reason} codes=[${(d.codes||[]).join(',')}]`));
  }

  if (allowedPages.length) {
    console.log(`\nPages allowed for user ${userId}: ${allowedPages.length}`);
    allowedPages.forEach(a => console.log(` - id=${a.id} key=${a.key} codes=[${(a.codes||[]).join(',')}]`));
  } else {
    console.log(`\nNo pages allowed for user ${userId}`);
  }

  // 4) Optionally list all permissions the user has via roles
  try {
    const perms = await Permission.list();
    // We will query a subset: check which of the distinct codes from pages the user has
    const distinctCodes = Array.from(new Set(rows.flatMap(r => (Array.isArray(r.permissions) ? r.permissions.map(x => (x && x.code) ? x.code : x) : []).filter(Boolean))));
    console.log('Checking user permissions for codes used by pages:');
    for (const code of distinctCodes) {
      const ok = await permissionChecker.hasPermission({ id: userId }, code);
      console.log(` - ${code}: ${ok ? 'YES' : 'NO'}`);
    }
  } catch (e) {
    console.error('Error while checking permission list:', e.message);
  }

  await pool.end();
}

main().catch(async (err) => {
  console.error('Diagnostic error:', err);
  try { await pool.end(); } catch (e) {}
  process.exit(1);
});
