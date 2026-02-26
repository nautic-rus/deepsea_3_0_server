const SwaggerParser = require('swagger-parser');
const path = require('path');
const file = path.resolve(__dirname, '../docs/api/swagger.json');

(async function(){
  console.log('Validating', file);
  try {
    const api = await SwaggerParser.validate(file);
    console.log('✔ Validation succeeded — spec is valid JSON/YAML and references resolve.');
    console.log('Title:', api.info && api.info.title);
    process.exit(0);
  } catch (err) {
    console.error('✖ Validation failed:');
    console.error(err && err.message ? err.message : err);
    if (err.details && err.details.length) {
      console.error('\nDetails:');
      err.details.forEach(d => console.error('-', d.message || d));
    }
    // If there are unresolved $refs, try to print them
    if (err.stack) console.error('\nStack:\n', err.stack);
    process.exit(2);
  }
})();
