const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validateApiKey } = require('../middleware/security');
const { validateHmacSignature } = require('../middleware/hmac.middleware');
const uploadValidator = require('../middleware/upload-validator');

// Apply security layers: HMAC -> API Key -> JWT Auth
router.use(validateHmacSignature);
router.use(validateApiKey);
router.use(authenticate);

// User routes
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.post('/upload', uploadValidator.validateFileUpload, userController.uploadFile);
router.delete('/account', userController.deleteAccount);

module.exports = router;
