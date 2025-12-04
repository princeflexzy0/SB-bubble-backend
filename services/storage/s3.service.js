const AWS = require('aws-sdk');
const { createLogger } = require('../../config/monitoring');

const logger = createLogger('s3-service');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET;

/**
 * Upload file to S3
 */
async function uploadFile(key, buffer, contentType) {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'private' // Always private
    };

    const result = await s3.upload(params).promise();
    logger.info('File uploaded', { key, size: buffer.length });
    return result.Location;
  } catch (error) {
    logger.error('S3 upload failed', { key, error: error.message });
    throw error;
  }
}

/**
 * Generate presigned URL for secure download
 */
async function getPresignedUrl(key, expiresIn = 3600) {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Expires: expiresIn
    };

    const url = await s3.getSignedUrlPromise('getObject', params);
    logger.info('Presigned URL generated', { key, expiresIn });
    return url;
  } catch (error) {
    logger.error('Presigned URL generation failed', { key, error: error.message });
    throw error;
  }
}

/**
 * Delete file from S3
 */
async function deleteFile(key) {
  try {
    await s3.deleteObject({
      Bucket: BUCKET_NAME,
      Key: key
    }).promise();

    logger.info('File deleted', { key });
    return true;
  } catch (error) {
    logger.error('S3 delete failed', { key, error: error.message });
    throw error;
  }
}

/**
 * Check if file exists
 */
async function fileExists(key) {
  try {
    await s3.headObject({
      Bucket: BUCKET_NAME,
      Key: key
    }).promise();
    return true;
  } catch (error) {
    if (error.code === 'NotFound') {
      return false;
    }
    throw error;
  }
}

module.exports = {
  uploadFile,
  getPresignedUrl,
  deleteFile,
  fileExists
};
