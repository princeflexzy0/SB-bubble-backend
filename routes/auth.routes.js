const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authLimiter } = require('../middleware/security');
const { validate, schemas } = require('../middleware/validation');

// Public routes (no API key required)
router.post('/signup', authLimiter, validate(schemas.signup), authController.signUp);
router.post('/signin', authLimiter, validate(schemas.signin), authController.signIn);
router.post('/reset-password', authLimiter, authController.resetPassword);
router.post('/refresh', authController.refreshToken);

// Protected routes (API key required)
router.post('/signout', authController.signOut);
router.get('/me', authController.getMe);

module.exports = router;
