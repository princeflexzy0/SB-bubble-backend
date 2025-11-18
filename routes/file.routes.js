const express = require('express');
const router = express.Router();
const fileController = require('../controllers/file.controller');
const { upload, validateFile } = require('../middleware/fileValidation');
const { uploadLimiter } = require('../middleware/security');

/**
 * @route   POST /api/v1/files/upload
 * @desc    Upload file to S3
 * @access  Private
 */
router.post('/upload', uploadLimiter, upload.single('file'), validateFile, fileController.uploadFile);

/**
 * @route   GET /api/v1/files/:fileId
 * @desc    Get file download URL
 * @access  Private
 */
router.get('/:fileId', fileController.getFile);

/**
 * @route   GET /api/v1/files
 * @desc    List user's files
 * @access  Private
 */
router.get('/', fileController.listFiles);

/**
 * @route   DELETE /api/v1/files/:fileId
 * @desc    Delete file
 * @access  Private
 */
router.delete('/:fileId', fileController.deleteFile);

module.exports = router;
