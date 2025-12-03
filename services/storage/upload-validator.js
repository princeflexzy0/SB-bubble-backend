const { createLogger } = require('../../config/monitoring');
const crypto = require('crypto');
const path = require('path');

const logger = createLogger('upload-validator');

// Allowed MIME types with magic bytes verification
const ALLOWED_TYPES = {
  'image/jpeg': { ext: 'jpg', magic: [0xFF, 0xD8, 0xFF] },
  'image/png': { ext: 'png', magic: [0x89, 0x50, 0x4E, 0x47] },
  'application/pdf': { ext: 'pdf', magic: [0x25, 0x50, 0x44, 0x46] }
};

// Max file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Min file size (1KB - prevents empty/dummy files)
const MIN_FILE_SIZE = 1024;

// Blocked file extensions (comprehensive list)
const BLOCKED_EXTENSIONS = [
  '.exe', '.bat', '.sh', '.cmd', '.com', '.pif', '.scr', '.vbs', 
  '.js', '.jar', '.zip', '.rar', '.7z', '.tar', '.gz', '.iso',
  '.dll', '.sys', '.msi', '.ps1', '.wsf', '.hta', '.cpl',
  '.php', '.asp', '.aspx', '.jsp', '.py', '.rb', '.pl'
];

// Dangerous patterns in filenames
const DANGEROUS_PATTERNS = [
  /\.\./,           // Path traversal
  /[<>:"|?*]/,      // Invalid chars
  /^\.+$/,          // Only dots
  /\x00/,           // Null bytes
  /[\r\n]/          // Newlines
];

/**
 * Verify file magic bytes match claimed MIME type
 */
const verifyMagicBytes = (buffer, mimeType) => {
  const typeInfo = ALLOWED_TYPES[mimeType];
  if (!typeInfo || !typeInfo.magic) return false;

  const fileBytes = new Uint8Array(buffer.slice(0, typeInfo.magic.length));
  return typeInfo.magic.every((byte, index) => fileBytes[index] === byte);
};

/**
 * Sanitize filename to prevent injection attacks
 */
const sanitizeFilename = (filename) => {
  // Remove path components
  let sanitized = path.basename(filename);
  
  // Remove dangerous characters
  sanitized = sanitized.replace(/[<>:"|?*\x00-\x1f]/g, '_');
  
  // Limit length
  if (sanitized.length > 100) {
    const ext = path.extname(sanitized);
    sanitized = sanitized.substring(0, 100 - ext.length) + ext;
  }
  
  // Ensure it has a name
  if (!sanitized || sanitized === '.' || sanitized === '..') {
    sanitized = 'unnamed_file';
  }
  
  return sanitized;
};

/**
 * Validate file upload - COMPREHENSIVE SERVER-SIDE VALIDATION
 */
const validateUpload = (filename, mimeType, fileSize, fileBuffer = null) => {
  const errors = [];
  const warnings = [];

  // 1. Check filename for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(filename)) {
      errors.push('Invalid filename detected');
      break;
    }
  }

  // 2. Check MIME type against whitelist
  if (!ALLOWED_TYPES[mimeType]) {
    errors.push(`File type not allowed. Allowed: JPG, PNG, PDF`);
  }

  // 3. Check file size (max)
  if (fileSize > MAX_FILE_SIZE) {
    errors.push(`File too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  // 4. Check file size (min)
  if (fileSize < MIN_FILE_SIZE) {
    errors.push(`File too small. Min size: ${MIN_FILE_SIZE / 1024}KB`);
  }

  // 5. Check for blocked extensions
  const ext = path.extname(filename).toLowerCase();
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    errors.push(`Dangerous file extension: ${ext}`);
  }

  // 6. Check extension matches MIME type
  if (ALLOWED_TYPES[mimeType] && ext !== `.${ALLOWED_TYPES[mimeType].ext}`) {
    // Allow .jpeg for image/jpeg
    if (!(mimeType === 'image/jpeg' && (ext === '.jpg' || ext === '.jpeg'))) {
      warnings.push(`Extension ${ext} doesn't match content type ${mimeType}`);
    }
  }

  // 7. Check for double extensions (zip bombs, disguised files)
  const extCount = (filename.match(/\./g) || []).length;
  if (extCount > 2) {
    errors.push('Suspicious filename with multiple extensions');
  }

  // 8. Verify magic bytes if buffer provided (SERVER-SIDE VERIFICATION)
  if (fileBuffer && errors.length === 0) {
    if (!verifyMagicBytes(fileBuffer, mimeType)) {
      errors.push('File content does not match declared type (magic bytes mismatch)');
    }
  }

  if (errors.length > 0) {
    logger.warn('File validation failed', { filename, mimeType, fileSize, errors });
    return { valid: false, errors, warnings };
  }

  logger.info('File validation passed', { filename, mimeType, fileSize });
  return { 
    valid: true, 
    allowedType: ALLOWED_TYPES[mimeType].ext,
    sanitizedFilename: sanitizeFilename(filename),
    warnings 
  };
};

/**
 * Generate secure S3 key with random component
 */
const generateSecureKey = (userId, originalFilename, docType) => {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  const sanitized = sanitizeFilename(originalFilename);
  const ext = path.extname(sanitized).toLowerCase();
  
  // Structure: kyc/{userId}/{docType}/{timestamp}-{random}{ext}
  return `kyc/${userId}/${docType}/${timestamp}-${random}${ext}`;
};

/**
 * Validate before S3 upload (final server-side check)
 */
const validateBeforeUpload = async (fileBuffer, filename, mimeType) => {
  const fileSize = fileBuffer.length;
  
  // Full validation including magic bytes
  const validation = validateUpload(filename, mimeType, fileSize, fileBuffer);
  
  if (!validation.valid) {
    throw new Error(`Upload validation failed: ${validation.errors.join(', ')}`);
  }
  
  return {
    sanitizedFilename: validation.sanitizedFilename,
    validatedType: validation.allowedType,
    fileSize
  };
};

module.exports = {
  validateUpload,
  validateBeforeUpload,
  generateSecureKey,
  sanitizeFilename,
  verifyMagicBytes,
  ALLOWED_TYPES,
  MAX_FILE_SIZE,
  MIN_FILE_SIZE
};
