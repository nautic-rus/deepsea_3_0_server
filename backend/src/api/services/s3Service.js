const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');

// Configure S3 client via environment variables. These should be set in
// backend/env or process environment when running the server.
const S3_ENDPOINT = process.env.S3_ENDPOINT || process.env.YC_S3_ENDPOINT || null;
const S3_REGION = process.env.S3_REGION || process.env.YC_S3_REGION || 'ru-central1';
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY_ID || process.env.YC_S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || null;
const S3_SECRET = process.env.S3_SECRET_ACCESS_KEY || process.env.YC_S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || null;

const s3Client = new S3Client({
  region: S3_REGION,
  endpoint: S3_ENDPOINT || undefined,
  credentials: S3_ACCESS_KEY && S3_SECRET ? { accessKeyId: S3_ACCESS_KEY, secretAccessKey: S3_SECRET } : undefined,
  forcePathStyle: true // Yandex uses path-style
});

class S3Service {
  /**
   * Upload a buffer to S3 and return object metadata
   * @param {Buffer} buffer
   * @param {string} originalName
   * @param {string} bucket
   * @param {string} contentType
   */
  static async uploadBuffer({ buffer, originalName, bucket, contentType }) {
    if (!buffer || !originalName) throw new Error('Missing buffer or filename');
    const key = `${uuidv4()}-${originalName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const params = {
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType || 'application/octet-stream'
    };
    const cmd = new PutObjectCommand(params);
    await s3Client.send(cmd);
    // Construct a url - for Yandex S3 the URL pattern is typically https://storage.yandexcloud.net/{bucket}/{key}
    const url = S3_ENDPOINT ? `${S3_ENDPOINT.replace(/\/$/, '')}/${bucket}/${encodeURIComponent(key)}` : `https://${bucket}.s3.${S3_REGION}.amazonaws.com/${encodeURIComponent(key)}`;
    return { bucket, key, url, size: buffer.length, content_type: contentType || 'application/octet-stream' };
  }

  static async deleteObject({ bucket, key }) {
    if (!bucket || !key) throw new Error('Missing bucket or key');
    const cmd = new DeleteObjectCommand({ Bucket: bucket, Key: key });
    await s3Client.send(cmd);
    return true;
  }
}

module.exports = S3Service;
