const path = require('path');
const fs = require('fs');

function resolveUploadsDir() {
  const uploadsDir = process.env.LOCAL_UPLOADS_DIR
    ? path.resolve(process.cwd(), process.env.LOCAL_UPLOADS_DIR)
    : path.resolve(process.cwd(), 'uploads');

  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch (e) {
    // ignore
  }

  return uploadsDir;
}

function resolveMountPath() {
  return process.env.LOCAL_UPLOADS_MOUNT_PATH || '/backend/uploads';
}

module.exports = {
  get uploadsDir() {
    return resolveUploadsDir();
  },
  get mountPath() {
    return resolveMountPath();
  }
};
