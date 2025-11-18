const fileService = require('../services/file.service');
const { AppError } = require('../middleware/errorHandler');

class FileController {
  /**
   * Upload file directly (with multer)
   */
  async uploadFile(req, res, next) {
    try {
      if (!req.file) {
        throw new AppError('No file uploaded', 400);
      }
      
      const userId = req.user.id;
      const result = await fileService.uploadFile(req.file, userId);
      
      res.status(201).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getUploadUrl(req, res, next) {
    try {
      const userId = req.user.id;
      const { filename, mime_type } = req.body;
      
      if (!filename || !mime_type) {
        throw new AppError('Filename and mime_type are required', 400);
      }
      
      const result = await fileService.generatePresignedUrl(userId, filename, mime_type);
      
      res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async confirmUpload(req, res, next) {
    try {
      const { file_id, size } = req.body;
      
      if (!file_id || !size) {
        throw new AppError('File ID and size are required', 400);
      }
      
      const file = await fileService.confirmUpload(file_id, size);
      
      res.status(200).json({
        status: 'success',
        data: { file }
      });
    } catch (error) {
      next(error);
    }
  }

  async getFile(req, res, next) {
    try {
      const userId = req.user.id;
      const { fileId } = req.params;
      
      const file = await fileService.getFileById(fileId, userId);
      
      res.status(200).json({
        status: 'success',
        data: { file }
      });
    } catch (error) {
      next(error);
    }
  }

  async getDownloadUrl(req, res, next) {
    try {
      const userId = req.user.id;
      const { fileId } = req.params;
      
      const result = await fileService.getDownloadUrl(fileId, userId);
      
      res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteFile(req, res, next) {
    try {
      const userId = req.user.id;
      const { fileId } = req.params;
      
      await fileService.deleteFile(fileId, userId);
      
      res.status(200).json({
        status: 'success',
        message: 'File deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async listFiles(req, res, next) {
    try {
      const userId = req.user.id;
      const { limit = 50, offset = 0 } = req.query;
      
      const result = await fileService.listUserFiles(userId, parseInt(limit), parseInt(offset));
      
      res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new FileController();
