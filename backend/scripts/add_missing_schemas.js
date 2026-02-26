const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'docs', 'api', 'swagger.json');
let spec = JSON.parse(fs.readFileSync(file,'utf8'));
if (!spec.components) spec.components = {};
if (!spec.components.schemas) spec.components.schemas = {};
const schemas = spec.components.schemas;
let changed = false;
if (!schemas.Document) {
  schemas.Document = {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      title: { type: 'string' },
      description: { type: 'string', nullable: true },
      code: { type: 'string', nullable: true, description: 'Document number/code' },
      project_id: { type: 'integer' },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' }
    }
  };
  changed = true;
  console.log('Added Document schema');
}
if (!schemas.EntityLink) {
  schemas.EntityLink = {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      active_type: { type: 'string' },
      active_id: { type: 'integer' },
      passive_type: { type: 'string' },
      passive_id: { type: 'integer' },
      relation_type: { type: 'string' },
      created_by: { type: 'integer', nullable: true },
      created_at: { type: 'string', format: 'date-time' }
    }
  };
  changed = true;
  console.log('Added EntityLink schema');
}
if (changed) {
  fs.writeFileSync(file, JSON.stringify(spec, null, 2), 'utf8');
  console.log('swagger.json updated (backup should exist already).');
} else {
  console.log('No changes needed.');
}
