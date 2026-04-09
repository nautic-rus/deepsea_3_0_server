const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');

let s3Client = null;
let s3ClientSignature = null;

function getS3Config() {
  return {
    endpoint: process.env.S3_ENDPOINT || process.env.YC_S3_ENDPOINT || null,
    region: process.env.S3_REGION || process.env.YC_S3_REGION || 'ru-central1',
    accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.YC_S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || null,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.YC_S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || null
  };
}

function getS3Client() {
  const config = getS3Config();
  const signature = JSON.stringify([config.endpoint, config.region, config.accessKeyId, config.secretAccessKey]);
  if (s3Client && s3ClientSignature === signature) return { client: s3Client, config };

  s3Client = new S3Client({
    region: config.region,
    endpoint: config.endpoint || undefined,
    credentials: config.accessKeyId && config.secretAccessKey
      ? { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey }
      : undefined,
    forcePathStyle: true
  });
  s3ClientSignature = signature;
  return { client: s3Client, config };
}

class S3Service {
  /**
   * Upload a buffer to S3 and return object metadata
   * @param {Buffer} buffer
   * @param {string} originalName
   * @param {string} bucket
   * @param {string} contentType
   */
  static async uploadBuffer({ buffer, originalName, bucket, contentType, directory }) {
    if (!buffer || !originalName) throw new Error('Missing buffer or filename');
    const { client, config } = getS3Client();
    // Sanitize original name and optional directory prefix
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const baseKey = `${uuidv4()}-${safeName}`;
    let key = baseKey;
    if (directory) {
      // allow alphanumeric, dash, underscore and slashes for subdirs
      const safeDir = String(directory).replace(/[^a-zA-Z0-9_\-\/]/g, '_').replace(/^\/+|\/+$/g, '');
      if (safeDir) key = `${safeDir}/${baseKey}`;
    }
    const params = {
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType || 'application/octet-stream'
    };
    const cmd = new PutObjectCommand(params);
    await client.send(cmd);
    // Construct a url - for Yandex S3 the URL pattern is typically https://storage.yandexcloud.net/{bucket}/{key}
    const url = config.endpoint
      ? `${config.endpoint.replace(/\/$/, '')}/${bucket}/${encodeURIComponent(key)}`
      : `https://${bucket}.s3.${config.region}.amazonaws.com/${encodeURIComponent(key)}`;
    return { bucket, key, url, size: buffer.length, content_type: contentType || 'application/octet-stream' };
  }

  static async deleteObject({ bucket, key }) {
    if (!bucket || !key) throw new Error('Missing bucket or key');
    const { client } = getS3Client();
    const cmd = new DeleteObjectCommand({ Bucket: bucket, Key: key });
    await client.send(cmd);
    return true;
  }

  /**
   * Return a readable stream for an S3 object.
   * @param {string} bucket
   * @param {string} key
   * @returns {stream.Readable}
   */
  static async getObjectStream({ bucket, key }) {
    if (!bucket || !key) throw new Error('Missing bucket or key');
    const { client } = getS3Client();
    const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
    const res = await client.send(cmd);
    // res.Body is a stream.Readable in Node.js
    return res.Body;
  }
}

module.exports = S3Service;
