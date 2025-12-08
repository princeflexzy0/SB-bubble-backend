const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate } = require('../middleware/auth.middleware');
const { validateApiKey } = require('../middleware/security');
const { validateHmacSignature } = require('../middleware/hmac.middleware');
const uploadValidator = require('../middleware/upload-validator');
const { createLogger } = require('../config/monitoring');
const logger = createLogger('upload-routes');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1
  }
});

// Import services
const fileService = require('../services/file.service');
const virusScanner = require('../services/storage/virus-scanner.service');

// Apply security layers
router.use(validateHmacSignature);
router.use(validateApiKey);
router.use(authenticate);

/**
 * POST /api/v1/upload/file
 * General file upload endpoint
 */
router.post('/file', 
  upload.single('file'),
  uploadValidator.validateUpload,
  async (req, res, next) => {
    try {
      const userId = req.user.id;
      const file = req.file;
      const category = req.body.category || 'general';

      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'No file provided'
        });
      }

      logger.info('File upload started', {
        userId,
        filename: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        category
      });

      // Step 1: Virus scan
      const scanResult = await virusScanner.scanBuffer(file.buffer, file.originalname);
      
      if (!scanResult.isClean) {
        logger.warn('Virus detected in upload', {
          userId,
          filename: file.originalname,
          threat: scanResult.threat
        });

        return res.status(400).json({
          success: false,
          error: 'File contains malicious content',
          details: scanResult.threat
        });
      }

      // Step 2: Upload to storage
      const result = await fileService.uploadFile(file, userId, category);

      logger.info('File upload successful', {
        userId,
        fileKey: result.key,
        url: result.url
      });

      res.json({
        success: true,
        data: {
          key: result.key,
          url: result.url,
          filename: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
          uploadedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('File upload failed', {
        error: error.message,
        userId: req.user?.id
      });
      next(error);
    }
  }
);

/**
 * POST /api/v1/upload/avatar
 * Upload user avatar/profile picture
 */
router.post('/avatar',
  upload.single('avatar'),
  uploadValidator.validateUpload,
  async (req, res, next) => {
    try {
      const userId = req.user.id;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'No avatar file provided'
        });
      }

      // Verify it's an image
      if (!file.mimetype.startsWith('image/')) {
        return res.status(400).json({
          success: false,
          error: 'Avatar must be an image file'
        });
      }

      logger.info('Avatar upload started', {
        userId,
        filename: file.originalname,
        size: file.size
      });

      // Scan for viruses
      const scanResult = await virusScanner.scanBuffer(file.buffer, file.originalname);
      
      if (!scanResult.isClean) {
        return res.status(400).json({
          success: false,
          error: 'File contains malicious content'
        });
      }

      // Upload to storage
      const result = await fileService.uploadFile(file, userId, 'avatars');

      // Update user profile with avatar URL
      const { pool } = require('../config/database');
      await pool.query(
        'UPDATE users SET avatar_url = $1 WHERE id = $2',
        [result.url, userId]
      );

      logger.info('Avatar upload successful', {
        userId,
        avatarUrl: result.url
      });

      res.json({
        success: true,
        data: {
          avatarUrl: result.url,
          uploadedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Avatar upload failed', {
        error: error.message,
        userId: req.user?.id
      });
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/upload/:key
 * Delete an uploaded file
 */
router.delete('/:key',
  async (req, res, next) => {
    try {
      const userId = req.user.id;
      const fileKey = req.params.key;

      logger.info('File deletion started', {
        userId,
        fileKey
      });

      // TODO: Verify user owns this file
      // For now, any authenticated user can delete

      await fileService.deleteFile(fileKey);

      logger.info('File deleted successfully', {
        userId,
        fileKey
      });

      res.json({
        success: true,
        message: 'File deleted successfully'
      });

    } catch (error) {
      logger.error('File deletion failed', {
        error: error.message,
        userId: req.user?.id,
        fileKey: req.params.key
      });
      next(error);
    }
  }
);

/**
 * GET /api/v1/upload/:key/url
 * Get a signed URL for a file
 */
router.get('/:key/url',
  async (req, res, next) => {
    try {
      const userId = req.user.id;
      const fileKey = req.params.key;
      const expiresIn = parseInt(req.query.expiresIn) || 3600; // 1 hour default

      logger.info('Generating signed URL', {
        userId,
        fileKey,
        expiresIn
      });

      const url = await fileService.getFileUrl(fileKey, expiresIn);

      res.json({
        success: true,
        data: {
          url,
          expiresIn,
          expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
        }
      });

    } catch (error) {
      logger.error('URL generation failed', {
        error: error.message,
        userId: req.user?.id,
        fileKey: req.params.key
      });
      next(error);
    }
  }
);

module.exports = router;
