const path = require('path');
const fs = require('fs');

// Directory where local uploads are stored (default: <repo>/backend/uploads)
const uploadsDir = process.env.LOCAL_UPLOADS_DIR ? path.resolve(process.cwd(), process.env.LOCAL_UPLOADS_DIR) : path.resolve(process.cwd(), 'backend', 'uploads');

// URL mount path for serving uploads from the Express app
const mountPath = process.env.LOCAL_UPLOADS_MOUNT_PATH;

// Ensure uploads directory exists
try {
  fs.mkdirSync(uploadsDir, { recursive: true });
} catch (e) {
  // ignore
}

module.exports = {
  uploadsDir,
  mountPath
};
