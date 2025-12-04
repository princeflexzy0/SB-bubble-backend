const { createLogger } = require('../config/monitoring');
const logger = createLogger('upload-validator');

// Magic bytes for file type validation
const MAGIC_BYTES = {
  'image/jpeg': ['ffd8ffe0', 'ffd8ffe1', 'ffd8ffe2'],
  'image/png': ['89504e47'],
  'image/webp': ['52494646'],
  'application/pdf': ['25504446']
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Validate file before upload
 */
function validateUpload(req, res, next) {
  try {
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      logger.warn('File too large', { size: file.size, filename: file.originalname });
      return res.status(400).json({ error: 'File too large (max 10MB)' });
    }

    // Check for suspicious multi-extension filenames
    const parts = file.originalname.split('.');
    if (parts.length > 2) {
      logger.warn('Suspicious filename', { filename: file.originalname });
      return res.status(400).json({ error: 'Invalid filename' });
    }

    // Validate magic bytes
    const buffer = file.buffer;
    const magicBytes = buffer.slice(0, 4).toString('hex');
    
    const declaredMime = file.mimetype;
    const validMagicBytes = MAGIC_BYTES[declaredMime];
    
    if (validMagicBytes) {
      const isValid = validMagicBytes.some(valid => magicBytes.startsWith(valid));
      
      if (!isValid) {
        logger.warn('Magic byte mismatch', {
          filename: file.originalname,
          declaredMime,
          actualMagicBytes: magicBytes
        });
        return res.status(400).json({ error: 'File type mismatch detected' });
      }
    }

    logger.info('File validated', {
      filename: file.originalname,
      size: file.size,
      mime: file.mimetype
    });

    next();
  } catch (error) {
    logger.error('Upload validation failed', { error: error.message });
    res.status(500).json({ error: 'Upload validation failed' });
  }
}

module.exports = { validateUpload };
