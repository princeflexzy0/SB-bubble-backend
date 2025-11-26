const { createLogger } = require('../../config/monitoring');

const logger = createLogger('upload-validator');

// Allowed MIME types
const ALLOWED_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'application/pdf': 'pdf'
};

// Max file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Blocked file extensions
const BLOCKED_EXTENSIONS = [
  '.exe', '.bat', '.sh', '.cmd', '.com', '.pif',
  '.scr', '.vbs', '.js', '.jar', '.zip', '.rar',
  '.7z', '.tar', '.gz'
];

/**
 * Validate file upload
 */
const validateUpload = (filename, mimeType, fileSize) => {
  const errors = [];

  // Check MIME type
  if (!ALLOWED_TYPES[mimeType]) {
    errors.push(`File type not allowed. Allowed: JPG, PNG, PDF`);
  }

  // Check file size
  if (fileSize > MAX_FILE_SIZE) {
    errors.push(`File too large. Max size: 10MB`);
  }

  // Check for blocked extensions
  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    errors.push(`Dangerous file extension: ${ext}`);
  }

  // Check for zip bombs (repeated extensions)
  const extCount = (filename.match(/\./g) || []).length;
  if (extCount > 2) {
    errors.push('Suspicious filename with multiple extensions');
  }

  if (errors.length > 0) {
    logger.warn('File validation failed', { filename, errors });
    return { valid: false, errors };
  }

  return { valid: true, allowedType: ALLOWED_TYPES[mimeType] };
};

/**
 * Generate secure S3 key
 */
const generateSecureKey = (userId, originalFilename, docType) => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const ext = originalFilename.substring(originalFilename.lastIndexOf('.'));
  
  return `kyc/${userId}/${docType}/${timestamp}-${random}${ext}`;
};

module.exports = {
  validateUpload,
  generateSecureKey,
  ALLOWED_TYPES,
  MAX_FILE_SIZE
};
