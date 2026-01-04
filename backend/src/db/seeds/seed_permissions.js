/**
 * Idempotent seed script to ensure required permission records exist in the permissions table.
 * Run with: node src/db/seeds/seed_permissions.js (from backend/)
 */
const pool = require('../connection');

const PERMISSIONS = [
  { code: 'users.view', name: 'View users', description: 'Allows viewing users' },
  { code: 'users.create', name: 'Create users', description: 'Allows creating users' },
  { code: 'users.update', name: 'Update users', description: 'Allows updating users' },
  { code: 'users.delete', name: 'Delete users', description: 'Allows deleting (soft-delete) users' },
  { code: 'departments.view', name: 'View departments', description: 'Allows viewing departments' },
  { code: 'departments.create', name: 'Create departments', description: 'Allows creating departments' },
  { code: 'departments.update', name: 'Update departments', description: 'Allows updating departments' },
  { code: 'departments.delete', name: 'Delete departments', description: 'Allows deleting departments' }
  ,
  // Permissions discovered in swagger.json but missing previously
  { code: 'documents.view', name: 'View documents', description: 'Auto-added from swagger: documents.view' },
  { code: 'documents.create', name: 'Create documents', description: 'Auto-added from swagger: documents.create' },
  { code: 'documents.update', name: 'Update documents', description: 'Auto-added from swagger: documents.update' },
  { code: 'documents.delete', name: 'Delete documents', description: 'Auto-added from swagger: documents.delete' },
  { code: 'equipment.view', name: 'View equipment', description: 'Auto-added from swagger: equipment.view' },
  { code: 'equipment.create', name: 'Create equipment', description: 'Auto-added from swagger: equipment.create' },
  { code: 'equipment.update', name: 'Update equipment', description: 'Auto-added from swagger: equipment.update' },
  { code: 'equipment.delete', name: 'Delete equipment', description: 'Auto-added from swagger: equipment.delete' },
  { code: 'issues.view', name: 'View issues', description: 'Auto-added from swagger: issues.view' },
  { code: 'issues.create', name: 'Create issues', description: 'Auto-added from swagger: issues.create' },
  { code: 'issues.update', name: 'Update issues', description: 'Auto-added from swagger: issues.update' },
  { code: 'issues.delete', name: 'Delete issues', description: 'Auto-added from swagger: issues.delete' },
  { code: 'materials.view', name: 'View materials', description: 'Auto-added from swagger: materials.view' },
  { code: 'materials.create', name: 'Create materials', description: 'Auto-added from swagger: materials.create' },
  { code: 'materials.update', name: 'Update materials', description: 'Auto-added from swagger: materials.update' },
  { code: 'materials.delete', name: 'Delete materials', description: 'Auto-added from swagger: materials.delete' },
  { code: 'permissions.view', name: 'View permissions', description: 'Auto-added from swagger: permissions.view' },
  { code: 'projects.view', name: 'View projects', description: 'Auto-added from swagger: projects.view' },
  { code: 'projects.create', name: 'Create projects', description: 'Auto-added from swagger: projects.create' },
  { code: 'projects.update', name: 'Update projects', description: 'Auto-added from swagger: projects.update' },
  { code: 'projects.delete', name: 'Delete projects', description: 'Auto-added from swagger: projects.delete' },
  { code: 'projects.assign', name: 'Assign projects', description: 'Auto-added from swagger: projects.assign' },
  { code: 'roles.view', name: 'View roles', description: 'Auto-added from swagger: roles.view' },
  { code: 'roles.create', name: 'Create roles', description: 'Auto-added from swagger: roles.create' },
  { code: 'roles.update', name: 'Update roles', description: 'Auto-added from swagger: roles.update' },
  { code: 'roles.delete', name: 'Delete roles', description: 'Auto-added from swagger: roles.delete' },
  { code: 'specifications.view', name: 'View specifications', description: 'Auto-added from swagger: specifications.view' },
  { code: 'specifications.create', name: 'Create specifications', description: 'Auto-added from swagger: specifications.create' },
  { code: 'specifications.update', name: 'Update specifications', description: 'Auto-added from swagger: specifications.update' },
  { code: 'specifications.delete', name: 'Delete specifications', description: 'Auto-added from swagger: specifications.delete' },
  { code: 'stages.view', name: 'View stages', description: 'Auto-added from swagger: stages.view' },
  { code: 'stages.create', name: 'Create stages', description: 'Auto-added from swagger: stages.create' },
  { code: 'stages.update', name: 'Update stages', description: 'Auto-added from swagger: stages.update' },
  { code: 'stages.delete', name: 'Delete stages', description: 'Auto-added from swagger: stages.delete' },
  { code: 'statements.view', name: 'View statements', description: 'Auto-added from swagger: statements.view' },
  { code: 'statements.create', name: 'Create statements', description: 'Auto-added from swagger: statements.create' },
  { code: 'statements.update', name: 'Update statements', description: 'Auto-added from swagger: statements.update' },
  { code: 'statements.delete', name: 'Delete statements', description: 'Auto-added from swagger: statements.delete' },
  { code: 'storage.view', name: 'View storage', description: 'Auto-added from swagger: storage.view' },
  { code: 'storage.create', name: 'Create storage', description: 'Auto-added from swagger: storage.create' },
  { code: 'storage.update', name: 'Update storage', description: 'Auto-added from swagger: storage.update' },
  { code: 'storage.delete', name: 'Delete storage', description: 'Auto-added from swagger: storage.delete' }
  ,
  { code: 'auth.view', name: 'View auth', description: 'Auto-added from swagger: auth.view' },
  { code: 'auth.create', name: 'Create auth', description: 'Auto-added from swagger: auth.create' }
];

async function upsertPermissions() {
  try {
    for (const p of PERMISSIONS) {
      // Check exists by code
      const res = await pool.query('SELECT id FROM permissions WHERE code = $1 LIMIT 1', [p.code]);
      if (res.rowCount > 0) {
        console.log(`Permission exists: ${p.code}`);
        continue;
      }

      // Try insert. Use minimal columns to be safe across schemas.
      const insertQuery = `INSERT INTO permissions (name, code, description) VALUES ($1, $2, $3) RETURNING id`;
      try {
        const ins = await pool.query(insertQuery, [p.name, p.code, p.description || null]);
        console.log(`Inserted permission ${p.code} (id=${ins.rows[0].id})`);
      } catch (e) {
        console.warn(`Failed to insert permission ${p.code}:`, e.message);
      }
    }
  } catch (err) {
    console.error('Seed permissions failed:', err.message);
  } finally {
    // close pool
    try { await pool.end(); } catch (e) { /* ignore */ }
  }
}

if (require.main === module) {
  upsertPermissions().then(() => console.log('Permissions seed completed')).catch(() => process.exit(1));
}

module.exports = { PERMISSIONS };
