/**
 * Add Postman test scripts for automatic variable extraction
 * Run: node scripts/add_postman_scripts.js
 */
const fs = require('fs');
const path = require('path');

const pmPath = path.join(__dirname, '../docs/api/postman_collection.json');
const pm = JSON.parse(fs.readFileSync(pmPath, 'utf8'));

// Scripts to extract variables from responses
const scripts = {
  // Login - extract tokens
  'POST /api/auth/login': {
    test: `
pm.test("Login successful", function () {
    pm.response.to.have.status(200);
});

if (pm.response.code === 200) {
    const json = pm.response.json();
    if (json.token) {
        pm.collectionVariables.set("accessToken", json.token);
        console.log("✓ accessToken saved");
    }
    if (json.refresh_token) {
        pm.collectionVariables.set("refreshToken", json.refresh_token);
        console.log("✓ refreshToken saved");
    }
    if (json.user && json.user.id) {
        pm.collectionVariables.set("currentUserId", json.user.id);
        console.log("✓ currentUserId saved:", json.user.id);
    }
}
`
  },

  // Refresh - update tokens
  'POST /api/auth/refresh': {
    prerequest: `
const refreshToken = pm.collectionVariables.get("refreshToken");
if (refreshToken) {
    pm.request.body.raw = JSON.stringify({ refresh_token: refreshToken });
}
`,
    test: `
pm.test("Refresh successful", function () {
    pm.response.to.have.status(200);
});

if (pm.response.code === 200) {
    const json = pm.response.json();
    if (json.token) {
        pm.collectionVariables.set("accessToken", json.token);
        console.log("✓ accessToken updated");
    }
    if (json.refresh_token) {
        pm.collectionVariables.set("refreshToken", json.refresh_token);
        console.log("✓ refreshToken updated");
    }
}
`
  },

  // Create user
  'POST /api/create_users': {
    test: `
pm.test("User created", function () {
    pm.response.to.have.status(201);
});

if (pm.response.code === 201) {
    const json = pm.response.json();
    if (json.id) {
        pm.collectionVariables.set("createdUserId", json.id);
        console.log("✓ createdUserId saved:", json.id);
    }
}
`
  },

  // Create department
  'POST /api/departments': {
    test: `
pm.test("Department created", function () {
    pm.response.to.have.status(201);
});

if (pm.response.code === 201) {
    const json = pm.response.json();
    if (json.id) {
        pm.collectionVariables.set("createdDeptId", json.id);
        console.log("✓ createdDeptId saved:", json.id);
    }
}
`
  },

  // Create role
  'POST /api/roles': {
    test: `
pm.test("Role created", function () {
    pm.response.to.have.status(201);
});

if (pm.response.code === 201) {
    const json = pm.response.json();
    if (json.id) {
        pm.collectionVariables.set("createdRoleId", json.id);
        console.log("✓ createdRoleId saved:", json.id);
    }
}
`
  },

  // Create project
  'POST /api/projects': {
    test: `
pm.test("Project created", function () {
    pm.response.to.have.status(201);
});

if (pm.response.code === 201) {
    const json = pm.response.json();
    if (json.id) {
        pm.collectionVariables.set("createdProjectId", json.id);
        console.log("✓ createdProjectId saved:", json.id);
    }
}
`
  },

  // Create issue
  'POST /api/issues': {
    test: `
pm.test("Issue created", function () {
    pm.response.to.have.status(201);
});

if (pm.response.code === 201) {
    const json = pm.response.json();
    if (json.id) {
        pm.collectionVariables.set("createdIssueId", json.id);
        console.log("✓ createdIssueId saved:", json.id);
    }
}
`
  },

  // Create document
  'POST /api/documents': {
    test: `
pm.test("Document created", function () {
    pm.response.to.have.status(201);
});

if (pm.response.code === 201) {
    const json = pm.response.json();
    if (json.id) {
        pm.collectionVariables.set("createdDocumentId", json.id);
        console.log("✓ createdDocumentId saved:", json.id);
    }
}
`
  },

  // Create material
  'POST /api/materials': {
    test: `
pm.test("Material created", function () {
    pm.response.to.have.status(201);
});

if (pm.response.code === 201) {
    const json = pm.response.json();
    if (json.id) {
        pm.collectionVariables.set("createdMaterialId", json.id);
        console.log("✓ createdMaterialId saved:", json.id);
    }
}
`
  },

  // Create equipment
  'POST /api/equipment': {
    test: `
pm.test("Equipment created", function () {
    pm.response.to.have.status(201);
});

if (pm.response.code === 201) {
    const json = pm.response.json();
    if (json.id) {
        pm.collectionVariables.set("createdEquipmentId", json.id);
        console.log("✓ createdEquipmentId saved:", json.id);
    }
}
`
  },

  // Create specification
  'POST /api/specifications': {
    test: `
pm.test("Specification created", function () {
    pm.response.to.have.status(201);
});

if (pm.response.code === 201) {
    const json = pm.response.json();
    if (json.id) {
        pm.collectionVariables.set("createdSpecificationId", json.id);
        console.log("✓ createdSpecificationId saved:", json.id);
    }
}
`
  },

  // Create stage
  'POST /api/stages': {
    test: `
pm.test("Stage created", function () {
    pm.response.to.have.status(201);
});

if (pm.response.code === 201) {
    const json = pm.response.json();
    if (json.id) {
        pm.collectionVariables.set("createdStageId", json.id);
        console.log("✓ createdStageId saved:", json.id);
    }
}
`
  },

  // Create storage
  'POST /api/storage': {
    test: `
pm.test("Storage item created", function () {
    pm.response.to.have.status(201);
});

if (pm.response.code === 201) {
    const json = pm.response.json();
    if (json.id) {
        pm.collectionVariables.set("createdStorageId", json.id);
        console.log("✓ createdStorageId saved:", json.id);
    }
}
`
  },

  // Create statement
  'POST /api/statements': {
    test: `
pm.test("Statement created", function () {
    pm.response.to.have.status(201);
});

if (pm.response.code === 201) {
    const json = pm.response.json();
    if (json.id) {
        pm.collectionVariables.set("createdStatementId", json.id);
        console.log("✓ createdStatementId saved:", json.id);
    }
}
`
  }
};

// Add missing variables
const existingVars = new Set((pm.variable || []).map(v => v.key));
const newVars = [
  'currentUserId', 'createdMaterialId', 'createdEquipmentId',
  'createdSpecificationId', 'createdStageId', 'createdStorageId', 'createdStatementId'
];
newVars.forEach(key => {
  if (!existingVars.has(key)) {
    pm.variable.push({ key, value: '', type: 'string' });
  }
});

// Function to add event scripts to a request item
function addScripts(item, scriptDef) {
  if (!item.event) item.event = [];
  
  if (scriptDef.prerequest) {
    const existing = item.event.find(e => e.listen === 'prerequest');
    if (existing) {
      existing.script.exec = scriptDef.prerequest.trim().split('\n');
    } else {
      item.event.push({
        listen: 'prerequest',
        script: {
          type: 'text/javascript',
          exec: scriptDef.prerequest.trim().split('\n')
        }
      });
    }
  }
  
  if (scriptDef.test) {
    const existing = item.event.find(e => e.listen === 'test');
    if (existing) {
      existing.script.exec = scriptDef.test.trim().split('\n');
    } else {
      item.event.push({
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: scriptDef.test.trim().split('\n')
        }
      });
    }
  }
}

// Process all items (recursively for folders)
function processItems(items) {
  items.forEach(item => {
    if (item.item) {
      // It's a folder
      processItems(item.item);
    } else if (item.name && scripts[item.name]) {
      // It's a request with a matching script
      addScripts(item, scripts[item.name]);
      console.log('Added scripts to:', item.name);
    }
  });
}

processItems(pm.item || []);

// Write updated collection
fs.writeFileSync(pmPath, JSON.stringify(pm, null, 2));
console.log('\n✓ Postman collection updated with scripts');
console.log('Variables:', pm.variable.map(v => v.key).join(', '));
