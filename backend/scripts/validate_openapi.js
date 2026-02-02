const SwaggerParser = require('swagger-parser');
const path = require('path');
(async ()=>{
  try{
    const api = await SwaggerParser.validate(path.join(__dirname,'../docs/api/swagger.json'));
    console.log('API name: %s, Version: %s', api.info.title, api.info.version);
    console.log('VALID');
  }catch(err){
    console.error('Validation error:');
    console.error(err && err.details ? err.details : err.message || err);
    process.exit(2);
  }
})();
