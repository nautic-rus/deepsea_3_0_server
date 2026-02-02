const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '../docs/api/swagger.json');
const obj = JSON.parse(fs.readFileSync(p,'utf8'));

// Ensure components.schemas exists
obj.components = obj.components || {};
obj.components.schemas = obj.components.schemas || {};

// Add IssueType schema
obj.components.schemas.IssueType = obj.components.schemas.IssueType || {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    name: { type: 'string' },
    code: { type: 'string' },
    description: { type: 'string', nullable: true },
    icon: { type: 'string', nullable: true },
    color: { type: 'string', nullable: true },
    order_index: { type: 'integer', nullable: true },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' }
  }
};

// Ensure paths exists
obj.paths = obj.paths || {};

// Create /api/issue_types GET
obj.paths['/api/issue_types'] = obj.paths['/api/issue_types'] || {
  get: {
    tags: ['issues'],
    summary: 'Список типов задач',
    description: 'Возвращает список всех записей из таблицы `issue_type` со всеми атрибутами. Требуется разрешение issues.view.',
    security: [ { bearerAuth: [] } ],
    'x-permissions': [ 'issues.view' ],
    responses: {
      '200': {
        description: 'OK',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                data: { type: 'array', items: { $ref: '#/components/schemas/IssueType' } }
              }
            }
          }
        }
      }
    },
    parameters: []
  }
};

// Create /api/issue_types/{id} GET
obj.paths['/api/issue_types/{id}'] = obj.paths['/api/issue_types/{id}'] || {
  get: {
    tags: ['issues'],
    summary: 'Получить тип задачи по id',
    description: 'Возвращает запись из `issue_type` по идентификатору. Требуется разрешение issues.view.',
    security: [ { bearerAuth: [] } ],
    'x-permissions': [ 'issues.view' ],
    parameters: [ { in: 'path', name: 'id', required: true, schema: { type: 'integer' } } ],
    responses: {
      '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/IssueType' } } } },
      '404': { description: 'Not found' }
    }
  }
};

fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
console.log('Updated', p);
