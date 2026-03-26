const fs = require('fs');
const path = require('path');

function load() {
  const p = path.resolve(__dirname, '../docs/api/swagger.json');
  const raw = fs.readFileSync(p, 'utf8');
  return { obj: JSON.parse(raw), p };
}

function save(obj, p) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8');
  console.log('Updated', p);
}

function ensure() {
  const { obj, p } = load();
  obj.paths = obj.paths || {};

  const pathKey = '/api/customer_questions/{id}/messages';
  if (!obj.paths[pathKey]) {
    obj.paths[pathKey] = {
      get: {
        tags: ['customer_questions'],
        summary: 'List messages for a customer question',
        security: [{ bearerAuth: [] }],
        'x-permissions': ['customer_questions.view'],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'integer' }, description: 'ID вопроса клиента' },
          { in: 'query', name: 'limit', schema: { type: 'integer' }, description: 'Limit results', example: 100 },
          { in: 'query', name: 'offset', schema: { type: 'integer' }, description: 'Pagination offset', example: 0 }
        ],
        responses: {
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/CustomerQuestionMessage' } } } } } }
          },
          '400': { description: 'Invalid id' },
          '401': { description: 'Authentication required' },
          '403': { description: 'Forbidden - missing permission customer_questions.view' },
          '404': { description: 'Customer question not found' }
        }
      },
      post: {
        tags: ['customer_questions'],
        summary: 'Add message to customer question',
        security: [{ bearerAuth: [] }],
        'x-permissions': ['customer_questions.comment'],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' }, description: 'ID вопроса клиента' }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CustomerQuestionMessageCreate' } } } },
        responses: {
          '201': { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/CustomerQuestionMessage' } } } },
          '400': { description: 'Invalid input or question id' },
          '401': { description: 'Authentication required' },
          '403': { description: 'Forbidden - missing permission customer_questions.comment' },
          '404': { description: 'Customer question not found' }
        }
      }
    };
  } else {
    console.log(pathKey, 'already present');
  }

  obj.components = obj.components || {};
  obj.components.schemas = obj.components.schemas || {};

  if (!obj.components.schemas.CustomerQuestionMessageCreate) {
    obj.components.schemas.CustomerQuestionMessageCreate = {
      type: 'object',
      required: ['content'],
      properties: { content: { type: 'string' }, parent_id: { type: 'integer', nullable: true } }
    };
  }

  if (!obj.components.schemas.CustomerQuestionMessage) {
    obj.components.schemas.CustomerQuestionMessage = {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        customer_question_id: { type: 'integer' },
        content: { type: 'string' },
        created_by: { type: 'integer' },
        created_at: { type: 'string', format: 'date-time' },
        author_name: { type: 'string', nullable: true }
      }
    };
  }

  save(obj, p);
}

ensure();
