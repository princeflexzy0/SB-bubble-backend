const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const env = require('../config/env');

// Configure AWS SDK
const s3 = new AWS.S3({
  accessKeyId: env.AWS_ACCESS_KEY_ID,
  secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  region: env.AWS_REGION,
  signatureVersion: 'v4',
  // Security: Enforce HTTPS
  sslEnabled: true,
  // Security: Use path-style URLs for better compatibility
  s3ForcePathStyle: false
});

class FileService {
  /**
   * Upload file to S3 with security best practices
   */
  async uploadFile(file, userId, folder = 'uploads') {
    try {
      // Generate secure filename
      const fileExt = path.extname(file.originalname);
      const fileName = `${uuidv4()}${fileExt}`;
      const key = `${folder}/${userId}/${fileName}`;
      
      const params = {
        Bucket: env.S3_BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        // Security: Enable server-side encryption
        ServerSideEncryption: 'AES256',
        // Security: Disable public access
        ACL: 'private',
        // Add metadata
        Metadata: {
          originalName: Buffer.from(file.originalname).toString('base64'),
          uploadedBy: userId,
          uploadedAt: new Date().toISOString()
        }
      };
      
      const result = await s3.upload(params).promise();
      
      return {
        key: result.Key,
        location: result.Location,
        bucket: result.Bucket,
        etag: result.ETag,
        size: file.size,
        mimetype: file.mimetype,
        originalName: file.originalname
      };
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new Error('File upload failed');
    }
  }
  
  /**
   * Generate pre-signed URL for secure file access
   */
  async getSignedUrl(key, expiresIn = 3600) {
    try {
      const params = {
        Bucket: env.S3_BUCKET_NAME,
        Key: key,
        Expires: expiresIn // URL expires in 1 hour by default
      };
      
      const url = await s3.getSignedUrlPromise('getObject', params);
      return url;
    } catch (error) {
      console.error('Generate signed URL error:', error);
      throw new Error('Failed to generate download URL');
    }
  }
  
  /**
   * Delete file from S3
   */
  async deleteFile(key) {
    try {
      const params = {
        Bucket: env.S3_BUCKET_NAME,
        Key: key
      };
      
      await s3.deleteObject(params).promise();
      return true;
    } catch (error) {
      console.error('S3 delete error:', error);
      throw new Error('File deletion failed');
    }
  }
  
  /**
   * Check if file exists
   */
  async fileExists(key) {
    try {
      await s3.headObject({
        Bucket: env.S3_BUCKET_NAME,
        Key: key
      }).promise();
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new FileService();
