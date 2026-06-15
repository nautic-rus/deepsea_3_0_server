#!/usr/bin/env node

/**
 * Copy all equipment_material_kits into project 48 and duplicate their items.
 *
 * Notes:
 * - Kit codes are unique only within a project, so we keep the source `code`
 *   unchanged when copying into project 48.
 * - The script is transactional and idempotent for repeated runs: if a kit with
 *   the same `code` already exists in project 48, it will be skipped.
 *
 * Usage:
 *   node scripts/copy_equipment_material_kits_to_project_48.js
 *   node scripts/copy_equipment_material_kits_to_project_48.js --dry-run
 */

const { Pool } = require('../backend/node_modules/pg');

const TARGET_PROJECT_ID = 48;

function buildPool() {
  return new Pool({
    host: '89.108.98.183',
    port: 5432,
    database: 'deepsea3',
    user: 'postgres',
    password: 'x5Wi9)I~1esI9h_',
    ssl: false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    keepAlive: true,
  });
}
function parseArgs(argv) {
  return {
    dryRun: argv.includes('--dry-run'),
  };
}

function normalizeCode(code, sourceKitId) {
  const normalized = String(code || '').trim();
  if (!normalized) {
    throw new Error(`Source kit ${sourceKitId} has an empty code`);
  }
  return normalized;
}

async function ensureProjectExists(client, projectId) {
  const res = await client.query('SELECT id, code, name FROM projects WHERE id = $1 LIMIT 1', [projectId]);
  const project = res.rows[0] || null;
  if (!project) {
    throw new Error(`Project ${projectId} not found`);
  }
  return project;
}

async function loadSourceKits(client, targetProjectId) {
  const res = await client.query(
    `
      SELECT
        id,
        project_id,
        code,
        name,
        description,
        created_by,
        updated_by,
        created_at,
        updated_at
      FROM equipment_material_kits
      WHERE project_id IS DISTINCT FROM $1
      ORDER BY id
    `,
    [targetProjectId]
  );
  return res.rows || [];
}

async function loadItemsForKits(client, kitIds) {
  if (!kitIds.length) return [];

  const res = await client.query(
    `
      SELECT
        id,
        kit_id,
        part_code,
        material_id,
        quantity,
        notes,
        created_at
      FROM equipment_material_kit_items
      WHERE kit_id = ANY($1::int[])
      ORDER BY kit_id, id
    `,
    [kitIds]
  );
  return res.rows || [];
}

async function kitExistsInProjectByCode(client, projectId, code) {
  const res = await client.query(
    `
      SELECT id, project_id, code, name
      FROM equipment_material_kits
      WHERE project_id = $1 AND code = $2
      LIMIT 1
    `,
    [projectId, code]
  );
  return res.rows[0] || null;
}

async function insertKit(client, kit, destinationCode, targetProjectId) {
  const res = await client.query(
    `
      INSERT INTO equipment_material_kits (
        project_id,
        code,
        name,
        description,
        created_by,
        updated_by,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `,
    [
      targetProjectId,
      destinationCode,
      kit.name,
      kit.description,
      kit.created_by,
      kit.updated_by,
      kit.created_at,
      kit.updated_at,
    ]
  );
  return res.rows[0].id;
}

async function insertItem(client, item, destinationKitId) {
  await client.query(
    `
      INSERT INTO equipment_material_kit_items (
        kit_id,
        part_code,
        material_id,
        quantity,
        notes,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [
      destinationKitId,
      item.part_code,
      item.material_id,
      item.quantity,
      item.notes,
      item.created_at,
    ]
  );
}

async function main() {
  const { dryRun } = parseArgs(process.argv.slice(2));
  const pool = buildPool();
  const client = await pool.connect();

  try {
    await ensureProjectExists(client, TARGET_PROJECT_ID);

    const sourceKits = await loadSourceKits(client, TARGET_PROJECT_ID);
    const sourceKitIds = sourceKits.map((kit) => kit.id);
    const kitItems = await loadItemsForKits(client, sourceKitIds);

    const itemsByKitId = new Map();
    for (const item of kitItems) {
      const kitId = Number(item.kit_id);
      if (!itemsByKitId.has(kitId)) itemsByKitId.set(kitId, []);
      itemsByKitId.get(kitId).push(item);
    }

    console.log(`Source kits: ${sourceKits.length}`);
    console.log(`Source items: ${kitItems.length}`);
    console.log(`Target project: ${TARGET_PROJECT_ID}`);
    if (dryRun) {
      console.log('Dry run enabled, no changes will be written.');
      for (const kit of sourceKits.slice(0, 10)) {
        console.log(`- ${kit.code} -> ${normalizeCode(kit.code, kit.id)}`);
      }
      return;
    }

    await client.query('BEGIN');

    let copiedKits = 0;
    let skippedKits = 0;
    let copiedItems = 0;

    for (const kit of sourceKits) {
      const destinationCode = normalizeCode(kit.code, kit.id);
      const existing = await kitExistsInProjectByCode(client, TARGET_PROJECT_ID, destinationCode);

      if (existing) {
        skippedKits += 1;
        console.log(`Skip kit ${kit.id} (${kit.code}): code already exists in project ${TARGET_PROJECT_ID}`);
        continue;
      }

      const destinationKitId = await insertKit(client, kit, destinationCode, TARGET_PROJECT_ID);
      copiedKits += 1;

      const sourceItems = itemsByKitId.get(Number(kit.id)) || [];
      for (const item of sourceItems) {
        await insertItem(client, item, destinationKitId);
        copiedItems += 1;
      }

      console.log(
        `Copied kit ${kit.id} (${kit.code}) -> ${destinationKitId} (${destinationCode}), items: ${sourceItems.length}`
      );
    }

    await client.query('COMMIT');

    console.log(`Done. Copied kits: ${copiedKits}, skipped kits: ${skippedKits}, copied items: ${copiedItems}`);
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('Rollback failed:', rollbackErr.message);
    }
    console.error('Copy failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(async (err) => {
  console.error('Unhandled error:', err);
  try {
    await pool.end();
  } catch (closeErr) {
    console.error('Failed to close pool:', closeErr.message);
  }
  process.exit(1);
});
