const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth.middleware');
const authController = require('../../controllers/auth/auth.controller');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/google/start', authController.googleStart);
router.post('/google/callback', authController.googleCallback);

module.exports = router;

// Apple Sign-In routes
router.get('/apple/start', authController.appleStart);
router.post('/apple/callback', authController.appleCallback);

// Account Linking
router.post('/link/google', authenticate, authController.linkGoogle);
router.post('/link/apple', authenticate, authController.linkApple);

// Password Management
router.post('/change-password', authenticate, authController.changePassword);
