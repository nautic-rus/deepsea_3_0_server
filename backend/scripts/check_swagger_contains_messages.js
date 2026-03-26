const fs = require('fs');
const p = require('path').resolve(__dirname, '../docs/api/swagger.json');
const obj = JSON.parse(fs.readFileSync(p, 'utf8'));
console.log('hasPath:', !!(obj.paths && obj.paths['/api/customer_questions/{id}/messages']));
console.log('hasSchemaCreate:', !!(obj.components && obj.components.schemas && obj.components.schemas.CustomerQuestionMessageCreate));
console.log('hasSchema:', !!(obj.components && obj.components.schemas && obj.components.schemas.CustomerQuestionMessage));
