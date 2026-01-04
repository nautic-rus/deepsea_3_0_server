const fs = require('fs');
const path = require('path');

const swaggerPath = path.resolve(__dirname, '../docs/api/swagger.json');
const swagger = JSON.parse(fs.readFileSync(swaggerPath, 'utf8'));
let changed = false;

function resourceFromPath(p) {
  const segs = p.split('/').filter(Boolean);
  // find segment after 'api'
  const apiIndex = segs.indexOf('api');
  let res = null;
  if (apiIndex >= 0 && segs.length > apiIndex + 1) res = segs[apiIndex + 1];
  else if (segs.length > 0) res = segs[0];
  if (!res) return 'resource';
  // normalize: remove path params and trailing parts
  res = res.replace(/[^a-zA-Z0-9_\-]/g, '');
  return res;
}

function actionFromMethodAndPath(method, path) {
  const m = method.toUpperCase();
  if (path.includes('/assign')) return 'assign';
  if (path.includes('/apply')) return 'apply';
  if (m === 'GET') return 'view';
  if (m === 'POST') return 'create';
  if (m === 'PUT' || m === 'PATCH') return 'update';
  if (m === 'DELETE') return 'delete';
  return 'use';
}

function capitalizeFirst(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

for (const [p, methods] of Object.entries(swagger.paths || {})) {
  for (const [m, op] of Object.entries(methods)) {
    // skip non-HTTP keys
    const method = m.toLowerCase();
    if (!['get','post','put','patch','delete'].includes(method)) continue;

    const res = resourceFromPath(p);
    const action = actionFromMethodAndPath(method, p);
    const perm = `${res}.${action}`;

    // default summary if missing
    if (!op.summary || op.summary === '') {
      let summary = '';
      if (action === 'view') {
        // check if path contains path param -> single get
        if (p.includes('{')) summary = `Получить ${res}`;
        else summary = `Получить список ${res}`;
      } else if (action === 'create') summary = `Создать ${res}`;
      else if (action === 'update') summary = `Обновить ${res}`;
      else if (action === 'delete') summary = `Удалить ${res}`;
      else if (action === 'assign') summary = `Назначить ${res}`;
      else if (action === 'apply') summary = `Применить ${res}`;
      else summary = `${capitalizeFirst(action)} ${res}`;
      op.summary = summary;
      changed = true;
    }

    // default x-permissions if missing
    if (!op['x-permissions'] || (Array.isArray(op['x-permissions']) && op['x-permissions'].length === 0)) {
      op['x-permissions'] = [perm];
      changed = true;
    }

    // default description if missing
    if (!op.description || op.description === '') {
      let desc = '';
      if (action === 'view') {
        if (p.includes('{')) desc = `Возвращает ${res}. Требуется разрешение ${perm}.`;
        else desc = `Возвращает список ${res}. Требуется разрешение ${perm}.`;
      } else if (action === 'create') desc = `Создаёт ${res}. Требуется разрешение ${perm}.`;
      else if (action === 'update') desc = `Обновляет ${res}. Требуется разрешение ${perm}.`;
      else if (action === 'delete') desc = `Удаляет ${res}. Требуется разрешение ${perm}.`;
      else desc = `${op.summary || ''} Требуется разрешение ${perm}.`;
      op.description = desc;
      changed = true;
    }
  }
}

if (changed) {
  fs.writeFileSync(swaggerPath, JSON.stringify(swagger, null, 2), 'utf8');
  console.log('swagger.json updated with default summaries/descriptions/x-permissions');
} else {
  console.log('No changes needed in swagger.json');
}
