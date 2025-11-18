const multer = require('multer');
const path = require('path');

// Allowed MIME types
const ALLOWED_MIME_TYPES = {
  images: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  documents: ['application/pdf', 'application/msword', 
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'application/vnd.ms-excel',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  videos: ['video/mp4', 'video/mpeg', 'video/quicktime'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/mp3']
};

const ALL_ALLOWED_TYPES = [
  ...ALLOWED_MIME_TYPES.images,
  ...ALLOWED_MIME_TYPES.documents,
  ...ALLOWED_MIME_TYPES.videos,
  ...ALLOWED_MIME_TYPES.audio
];

// Max file size (from env or default 50MB)
const MAX_FILE_SIZE = (process.env.MAX_FILE_SIZE_MB || 50) * 1024 * 1024;

// File filter function
const fileFilter = (req, file, cb) => {
  // Check MIME type
  if (!ALL_ALLOWED_TYPES.includes(file.mimetype)) {
    return cb(new Error(`File type not allowed. Allowed types: images, documents, videos, audio`), false);
  }
  
  // Check file extension matches MIME type
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeExt = file.mimetype.split('/')[1];
  
  if (!ext.includes(mimeExt) && !mimeExt.includes(ext.replace('.', ''))) {
    return cb(new Error('File extension does not match MIME type'), false);
  }
  
  cb(null, true);
};

// Multer configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10 // Max 10 files per request
  },
  fileFilter: fileFilter
});

// Validate file after upload
const validateFile = (req, res, next) => {
  if (!req.file && !req.files) {
    return res.status(400).json({
      status: 'error',
      message: 'No file uploaded'
    });
  }
  
  const file = req.file || (req.files && req.files[0]);
  
  // Additional validation
  if (file.size === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'File is empty'
    });
  }
  
  if (file.size > MAX_FILE_SIZE) {
    return res.status(400).json({
      status: 'error',
      message: `File too large. Max size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`
    });
  }
  
  next();
};

module.exports = {
  upload,
  validateFile,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE
};
