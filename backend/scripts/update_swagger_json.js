const fs = require('fs');
const p = 'docs/api/swagger.json';
let s = JSON.parse(fs.readFileSync(p, 'utf8'));
if (!s.paths) s.paths = {};
function bearer() { return [{ bearerAuth: [] }]; }

s.paths['/api/job_titles'] = Object.assign({}, s.paths['/api/job_titles'] || {}, {
  get: {
    tags: ['job_titles'],
    summary: 'Список должностей',
    description: 'Возвращает список всех должностей (id, name). Требуется разрешение job_titles.view.',
    security: bearer(),
    'x-permissions': ['job_titles.view'],
    responses: { '200': { description: 'OK' } }
  },
  post: {
    tags: ['job_titles'],
    summary: 'Создать должность',
    description: 'Создает новую запись в таблице `job_title`.',
    security: bearer(),
    'x-permissions': ['job_titles.create'],
    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' } } } } } },
    responses: { '201': { description: 'Created' } }
  }
});

s.paths['/api/job_titles/{id}'] = Object.assign({}, s.paths['/api/job_titles/{id}'] || {}, {
  put: {
    tags: ['job_titles'],
    summary: 'Обновить должность',
    description: 'Обновляет запись должности по id.',
    security: bearer(),
    'x-permissions': ['job_titles.update'],
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' } } } } } },
    responses: { '200': { description: 'OK' } }
  },
  delete: {
    tags: ['job_titles'],
    summary: 'Удалить должность',
    description: 'Удаляет запись должности.',
    security: bearer(),
    'x-permissions': ['job_titles.delete'],
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
    responses: { '200': { description: 'Deleted' } }
  }
});

s.paths['/api/pages'] = Object.assign({}, s.paths['/api/pages'] || {}, {
  get: {
    tags: ['pages'],
    summary: 'Список страниц (admin view)',
    description: 'Возвращает список страниц с агрегированными разрешениями.',
    security: bearer(),
    'x-permissions': ['pages.view'],
    responses: { '200': { description: 'OK' } }
  },
  post: {
    tags: ['pages'],
    summary: 'Создать страницу',
    description: 'Создает новую страницу.',
    security: bearer(),
    'x-permissions': ['pages.create'],
    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['key'], properties: { key: { type: 'string' }, path: { type: 'string' }, parent_id: { type: 'integer' }, icon: { type: 'string' }, order_index: { type: 'integer' }, main_menu: { type: 'boolean' } } } } } },
    responses: { '201': { description: 'Created' } }
  }
});

s.paths['/api/pages/{id}'] = Object.assign({}, s.paths['/api/pages/{id}'] || {}, {
  put: {
    tags: ['pages'],
    summary: 'Обновить страницу',
    description: 'Обновляет страницу по id.',
    security: bearer(),
    'x-permissions': ['pages.update'],
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { key: { type: 'string' }, path: { type: 'string' }, parent_id: { type: 'integer' }, icon: { type: 'string' }, order_index: { type: 'integer' }, main_menu: { type: 'boolean' } } } } } },
    responses: { '200': { description: 'OK' } }
  },
  delete: {
    tags: ['pages'],
    summary: 'Удалить страницу',
    description: 'Удаляет страницу.',
    security: bearer(),
    'x-permissions': ['pages.delete'],
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
    responses: { '200': { description: 'Deleted' } }
  }
});

s.paths['/api/page_permissions'] = Object.assign({}, s.paths['/api/page_permissions'] || {}, {
  get: {
    tags: ['page_permissions'],
    summary: 'Список разрешений для страниц',
    description: 'Возвращает список записей из таблицы `page_permissions`. Можно фильтровать по page_id.',
    security: bearer(),
    'x-permissions': ['page_permissions.view'],
    parameters: [{ in: 'query', name: 'page_id', required: false, schema: { type: 'integer' } }],
    responses: { '200': { description: 'OK' } }
  },
  post: {
    tags: ['page_permissions'],
    summary: 'Привязать разрешение к странице',
    description: 'Создает запись в `page_permissions`.',
    security: bearer(),
    'x-permissions': ['page_permissions.create'],
    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['page_id', 'permission_id'], properties: { page_id: { type: 'integer' }, permission_id: { type: 'integer' } } } } } },
    responses: { '201': { description: 'Created' } }
  }
});

s.paths['/api/page_permissions/{id}'] = Object.assign({}, s.paths['/api/page_permissions/{id}'] || {}, {
  delete: {
    tags: ['page_permissions'],
    summary: 'Удалить привязку разрешения к странице',
    description: 'Удаляет запись из `page_permissions`.',
    security: bearer(),
    'x-permissions': ['page_permissions.delete'],
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
    responses: { '200': { description: 'Deleted' } }
  }
});

fs.writeFileSync(p, JSON.stringify(s, null, 2));
console.log('swagger.json updated');
