const fs = require('fs');
const p = 'backend/docs/api/swagger.json';
const swagger = JSON.parse(fs.readFileSync(p,'utf8'));
const addPath = (path, obj) => { if(!swagger.paths) swagger.paths = {}; swagger.paths[path] = obj; };
// Helper to generate standard list/get/post/put/delete using existing schemas
const makeListPath = (tag, schemaName, createRequired=[]) => ({
  get: {
    tags: [tag.toLowerCase()],
    summary: `Получить список ${tag.toLowerCase()}`,
    description: `Возвращает список ${tag.toLowerCase()} с пагинацией. Требуется разрешение ${tag.toLowerCase()}.`,
    security: [{ bearerAuth: [] }],
    'x-permissions': [`${tag.toLowerCase()}.view`],
    responses: { '200': { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: `#/components/schemas/${schemaName}` } }, meta: { type: 'object', properties: { page: { type: 'integer' }, limit: { type: 'integer' }, total: { type: 'integer' } } } } } } } } }
  },
  post: {
    tags: [tag.toLowerCase()],
    summary: `Создать ${tag.slice(0,-1).toLowerCase()}`,
    security: [{ bearerAuth: [] }],
    'x-permissions': [`${tag.toLowerCase()}.create`],
    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: createRequired, properties: {} } } } },
    responses: { '201': { description: 'Created', content: { 'application/json': { schema: { $ref: `#/components/schemas/${schemaName}` } } } } }
  }
});

const makeItemPath = (tag, schemaName) => ({
  get: {
    tags: [tag.toLowerCase()],
    summary: `Получить ${tag.slice(0,-1).toLowerCase()}`,
    security: [{ bearerAuth: [] }],
    'x-permissions': [`${tag.toLowerCase()}.view`],
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
    responses: { '200': { description: 'OK', content: { 'application/json': { schema: { $ref: `#/components/schemas/${schemaName}` } } } } }
  },
  put: {
    tags: [tag.toLowerCase()],
    summary: `Обновить ${tag.slice(0,-1).toLowerCase()}`,
    security: [{ bearerAuth: [] }],
    'x-permissions': [`${tag.toLowerCase()}.update`],
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: {} } } } },
    responses: { '200': { description: 'Updated', content: { 'application/json': { schema: { $ref: `#/components/schemas/${schemaName}` } } } } }
  },
  delete: {
    tags: [tag.toLowerCase()],
    summary: `Удалить ${tag.slice(0,-1).toLowerCase()}`,
    security: [{ bearerAuth: [] }],
    'x-permissions': [`${tag.toLowerCase()}.delete`],
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
    responses: { '200': { description: 'Deleted' } }
  }
});

// Add GET /api/users/{id} (missing get but swagger has put)
if(!swagger.paths['/api/users/{id}']) swagger.paths['/api/users/{id}'] = {};
swagger.paths['/api/users/{id}'].get = {
  tags: ['users'],
  summary: 'Получить пользователя',
  security: [{ bearerAuth: [] }],
  'x-permissions': ['users.view'],
  parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
  responses: { '200': { description: 'Профиль пользователя', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } }, '401': { description: 'Authentication required' }, '404': { description: 'User not found' } }
};

// Departments: add PUT and DELETE paths if missing
if(!swagger.paths['/api/departments/{id}']) swagger.paths['/api/departments/{id}'] = {};
swagger.paths['/api/departments/{id}'].put = {
  tags: ['departments'], summary: 'Обновить отдел', security: [{ bearerAuth: [] }], 'x-permissions': ['departments.update'], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' } } } } } }, responses: { '200': { description: 'Updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Department' } } } } }
};
swagger.paths['/api/departments/{id}'].delete = { tags: ['departments'], summary: 'Удалить отдел', security: [{ bearerAuth: [] }], 'x-permissions': ['departments.delete'], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }], responses: { '200': { description: 'Deleted' } } };

// Add resource groups: materials, equipment, specifications, stages, storage, statements
const resources = [
  { tag: 'Materials', schema: 'Material', createRequired: ['name'] },
  { tag: 'Equipment', schema: 'Equipment', createRequired: ['name'] },
  { tag: 'Specifications', schema: 'Specification', createRequired: ['project_id', 'name'] },
  { tag: 'Stages', schema: 'Stage', createRequired: ['project_id', 'name'] },
  { tag: 'Storage', schema: 'Storage', createRequired: ['bucket_name','object_key','storage_type'] },
  { tag: 'Statements', schema: 'Statement', createRequired: ['document_id','name'] }
];
for(const rsrc of resources){
  const base = '/api/'+rsrc.tag.toLowerCase();
  const item = base+'/{id}';
  if(!swagger.paths[base]) swagger.paths[base] = {};
  const lp = makeListPath(rsrc.tag, rsrc.schema, rsrc.createRequired);
  swagger.paths[base].get = lp.get; swagger.paths[base].post = lp.post;
  if(!swagger.paths[item]) swagger.paths[item] = {};
  const ip = makeItemPath(rsrc.tag, rsrc.schema);
  swagger.paths[item].get = ip.get; swagger.paths[item].put = ip.put; swagger.paths[item].delete = ip.delete;
}

fs.writeFileSync(p, JSON.stringify(swagger, null, 2),'utf8');
console.log('Updated swagger.json with missing paths');
