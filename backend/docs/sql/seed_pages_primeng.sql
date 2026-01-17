-- Idempotent SQL seed for pages (with PrimeNG icons)
-- Places into `pages` table and maps permissions in `page_permissions` when permission codes exist.
-- Run from project root (adjust psql connection parameters):
-- psql "$DATABASE_URL" -f backend/docs/sql/seed_pages_primeng.sql

BEGIN;

-- Upsert top-level pages
INSERT INTO pages (key, path, title_key, title_en, icon, order_index)
VALUES
  ('dashboard', '/dashboard', 'menu.dashboard', 'Dashboard', 'pi pi-home', 0),
  ('projects', '/projects', 'menu.projects', 'Projects', 'pi pi-briefcase', 10),
  ('documents', '/documents', 'menu.documents', 'Documents', 'pi pi-file', 20),
  ('issues', '/issues', 'menu.issues', 'Issues', 'pi pi-exclamation-triangle', 30),
  ('materials', '/materials', 'menu.materials', 'Materials', 'pi pi-tags', 40),
  ('equipment', '/equipment', 'menu.equipment', 'Equipment', 'pi pi-wrench', 50),
  ('specifications', '/specifications', 'menu.specifications', 'Specifications', 'pi pi-file', 60),
  ('stages', '/stages', 'menu.stages', 'Stages', 'pi pi-calendar', 70),
  ('storage', '/storage', 'menu.storage', 'Storage', 'pi pi-database', 80),
  ('statements', '/statements', 'menu.statements', 'Statements', 'pi pi-list', 90),
  ('users', '/admin/users', 'menu.users', 'Users', 'pi pi-users', 100),
  ('roles', '/admin/roles', 'menu.roles', 'Roles', 'pi pi-shield', 110),
  ('permissions', '/admin/permissions', 'menu.permissions', 'Permissions', 'pi pi-key', 120),
  ('settings', '/admin/settings', 'menu.settings', 'Settings', 'pi pi-cog', 130),
  ('reports', '/reports', 'menu.reports', 'Reports', 'pi pi-chart-line', 140),
  ('notifications', '/notifications', 'menu.notifications', 'Notifications', 'pi pi-bell', 150)
ON CONFLICT (key) DO UPDATE
  SET path = EXCLUDED.path,
      title_key = EXCLUDED.title_key,
      title_en = EXCLUDED.title_en,
      icon = EXCLUDED.icon,
      order_index = EXCLUDED.order_index;

-- Upsert child pages (referencing parent by key)
-- project details
INSERT INTO pages (key, path, title_key, title_en, icon, order_index, parent_id)
VALUES (
  'project-details', '/projects/:id', 'menu.projectDetails', 'Project details', 'pi pi-folder', 11,
  (SELECT id FROM pages WHERE key = 'projects')
)
ON CONFLICT (key) DO UPDATE
  SET path = EXCLUDED.path,
      title_key = EXCLUDED.title_key,
      title_en = EXCLUDED.title_en,
      icon = EXCLUDED.icon,
      order_index = EXCLUDED.order_index,
      parent_id = COALESCE(EXCLUDED.parent_id, pages.parent_id);

-- material details
INSERT INTO pages (key, path, title_key, title_en, icon, order_index, parent_id)
VALUES (
  'material-details', '/materials/:id', 'menu.materialDetails', 'Material details', 'pi pi-tag', 41,
  (SELECT id FROM pages WHERE key = 'materials')
)
ON CONFLICT (key) DO UPDATE
  SET path = EXCLUDED.path,
      title_key = EXCLUDED.title_key,
      title_en = EXCLUDED.title_en,
      icon = EXCLUDED.icon,
      order_index = EXCLUDED.order_index,
      parent_id = COALESCE(EXCLUDED.parent_id, pages.parent_id);

-- document details
INSERT INTO pages (key, path, title_key, title_en, icon, order_index, parent_id)
VALUES (
  'document-details', '/documents/:id', 'menu.documentDetails', 'Document details', 'pi pi-file', 21,
  (SELECT id FROM pages WHERE key = 'documents')
)
ON CONFLICT (key) DO UPDATE
  SET path = EXCLUDED.path,
      title_key = EXCLUDED.title_key,
      title_en = EXCLUDED.title_en,
      icon = EXCLUDED.icon,
      order_index = EXCLUDED.order_index,
      parent_id = COALESCE(EXCLUDED.parent_id, pages.parent_id);

-- Map page -> permission codes (if permission exists)
-- Helper pattern: insert mapping only when permission code exists

-- projects -> projects.view
WITH p AS (SELECT id FROM pages WHERE key = 'projects'),
     perm AS (SELECT id FROM permissions WHERE code = 'projects.view')
INSERT INTO page_permissions (page_id, permission_id)
SELECT p.id, perm.id FROM p, perm
WHERE NOT EXISTS (
  SELECT 1 FROM page_permissions pp WHERE pp.page_id = p.id AND pp.permission_id = perm.id
);

-- project-details -> projects.view
WITH p AS (SELECT id FROM pages WHERE key = 'project-details'),
     perm AS (SELECT id FROM permissions WHERE code = 'projects.view')
INSERT INTO page_permissions (page_id, permission_id)
SELECT p.id, perm.id FROM p, perm
WHERE NOT EXISTS (
  SELECT 1 FROM page_permissions pp WHERE pp.page_id = p.id AND pp.permission_id = perm.id
);

-- documents -> documents.view
WITH p AS (SELECT id FROM pages WHERE key = 'documents'),
     perm AS (SELECT id FROM permissions WHERE code = 'documents.view')
INSERT INTO page_permissions (page_id, permission_id)
SELECT p.id, perm.id FROM p, perm
WHERE NOT EXISTS (
  SELECT 1 FROM page_permissions pp WHERE pp.page_id = p.id AND pp.permission_id = perm.id
);

-- document-details -> documents.view
WITH p AS (SELECT id FROM pages WHERE key = 'document-details'),
     perm AS (SELECT id FROM permissions WHERE code = 'documents.view')
INSERT INTO page_permissions (page_id, permission_id)
SELECT p.id, perm.id FROM p, perm
WHERE NOT EXISTS (
  SELECT 1 FROM page_permissions pp WHERE pp.page_id = p.id AND pp.permission_id = perm.id
);

-- issues -> issues.view
WITH p AS (SELECT id FROM pages WHERE key = 'issues'),
     perm AS (SELECT id FROM permissions WHERE code = 'issues.view')
INSERT INTO page_permissions (page_id, permission_id)
SELECT p.id, perm.id FROM p, perm
WHERE NOT EXISTS (
  SELECT 1 FROM page_permissions pp WHERE pp.page_id = p.id AND pp.permission_id = perm.id
);

-- materials -> materials.view
WITH p AS (SELECT id FROM pages WHERE key = 'materials'),
     perm AS (SELECT id FROM permissions WHERE code = 'materials.view')
INSERT INTO page_permissions (page_id, permission_id)
SELECT p.id, perm.id FROM p, perm
WHERE NOT EXISTS (
  SELECT 1 FROM page_permissions pp WHERE pp.page_id = p.id AND pp.permission_id = perm.id
);

-- equipment -> equipment.view
WITH p AS (SELECT id FROM pages WHERE key = 'equipment'),
     perm AS (SELECT id FROM permissions WHERE code = 'equipment.view')
INSERT INTO page_permissions (page_id, permission_id)
SELECT p.id, perm.id FROM p, perm
WHERE NOT EXISTS (
  SELECT 1 FROM page_permissions pp WHERE pp.page_id = p.id AND pp.permission_id = perm.id
);

-- specifications -> specifications.view
WITH p AS (SELECT id FROM pages WHERE key = 'specifications'),
     perm AS (SELECT id FROM permissions WHERE code = 'specifications.view')
INSERT INTO page_permissions (page_id, permission_id)
SELECT p.id, perm.id FROM p, perm
WHERE NOT EXISTS (
  SELECT 1 FROM page_permissions pp WHERE pp.page_id = p.id AND pp.permission_id = perm.id
);

-- stages -> stages.view
WITH p AS (SELECT id FROM pages WHERE key = 'stages'),
     perm AS (SELECT id FROM permissions WHERE code = 'stages.view')
INSERT INTO page_permissions (page_id, permission_id)
SELECT p.id, perm.id FROM p, perm
WHERE NOT EXISTS (
  SELECT 1 FROM page_permissions pp WHERE pp.page_id = p.id AND pp.permission_id = perm.id
);

-- storage -> storage.view
WITH p AS (SELECT id FROM pages WHERE key = 'storage'),
     perm AS (SELECT id FROM permissions WHERE code = 'storage.view')
INSERT INTO page_permissions (page_id, permission_id)
SELECT p.id, perm.id FROM p, perm
WHERE NOT EXISTS (
  SELECT 1 FROM page_permissions pp WHERE pp.page_id = p.id AND pp.permission_id = perm.id
);

-- statements -> statements.view
WITH p AS (SELECT id FROM pages WHERE key = 'statements'),
     perm AS (SELECT id FROM permissions WHERE code = 'statements.view')
INSERT INTO page_permissions (page_id, permission_id)
SELECT p.id, perm.id FROM p, perm
WHERE NOT EXISTS (
  SELECT 1 FROM page_permissions pp WHERE pp.page_id = p.id AND pp.permission_id = perm.id
);

-- users -> users.view
WITH p AS (SELECT id FROM pages WHERE key = 'users'),
     perm AS (SELECT id FROM permissions WHERE code = 'users.view')
INSERT INTO page_permissions (page_id, permission_id)
SELECT p.id, perm.id FROM p, perm
WHERE NOT EXISTS (
  SELECT 1 FROM page_permissions pp WHERE pp.page_id = p.id AND pp.permission_id = perm.id
);

-- roles -> roles.view
WITH p AS (SELECT id FROM pages WHERE key = 'roles'),
     perm AS (SELECT id FROM permissions WHERE code = 'roles.view')
INSERT INTO page_permissions (page_id, permission_id)
SELECT p.id, perm.id FROM p, perm
WHERE NOT EXISTS (
  SELECT 1 FROM page_permissions pp WHERE pp.page_id = p.id AND pp.permission_id = perm.id
);

-- permissions -> permissions.view
WITH p AS (SELECT id FROM pages WHERE key = 'permissions'),
     perm AS (SELECT id FROM permissions WHERE code = 'permissions.view')
INSERT INTO page_permissions (page_id, permission_id)
SELECT p.id, perm.id FROM p, perm
WHERE NOT EXISTS (
  SELECT 1 FROM page_permissions pp WHERE pp.page_id = p.id AND pp.permission_id = perm.id
);

COMMIT;

-- End of seed
