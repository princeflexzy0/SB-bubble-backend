const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { createLogger } = require('../../config/monitoring');
const crypto = require('crypto');

const logger = createLogger('s3-service');

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const generatePresignedUploadUrl = async (fileName, fileType, userId, kycSessionId) => {
  try {
    const fileKey = `kyc/${userId}/${kycSessionId}/${crypto.randomUUID()}-${fileName}`;
    
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileKey,
      ContentType: fileType,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: parseInt(process.env.AWS_S3_PRESIGNED_EXPIRY) || 900,
    });

    logger.info('Presigned URL generated', { fileKey, userId });

    return {
      presignedUrl,
      fileKey,
      bucket: process.env.AWS_S3_BUCKET,
    };
  } catch (error) {
    logger.error('Failed to generate presigned URL', { error: error.message });
    throw new Error('Failed to generate upload URL');
  }
};

module.exports = {
  generatePresignedUploadUrl,
};
