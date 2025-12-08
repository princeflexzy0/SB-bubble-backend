const express = require('express');
const router = express.Router();
const authController = require('../../controllers/auth/auth.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { authLimiter } = require('../../middleware/security');
const { loginBruteForce, passwordResetBruteForce, signupBruteForce } = require('../../middleware/bruteForce.middleware');
const { auditLog, SENSITIVE_ACTIONS } = require('../../middleware/auditLog.middleware');
const { csrfProtection, getCsrfToken } = require('../../middleware/csrf.middleware');

// ==========================================
// PUBLIC ROUTES
// ==========================================

// CSRF Token
router.get('/csrf-token', getCsrfToken);

// Registration & Login
router.post('/signup', signupBruteForce, auditLog(SENSITIVE_ACTIONS.ACCOUNT_CREATED, 'user'), authController.register);
router.post('/signin', loginBruteForce, authController.login);
router.post('/register', signupBruteForce, authController.register); // Alias
router.post('/login', loginBruteForce, authController.login); // Alias

// OAuth
router.get('/google/start', authController.googleStart);
router.post('/google/callback', authController.googleCallback);
router.get('/apple/start', authController.appleStart);
router.post('/apple/callback', authController.appleCallback);

// Password Reset
router.post('/reset-password', passwordResetBruteForce, authController.resetPassword);

// Token Management
router.post('/refresh', authLimiter, authController.refresh);
router.post('/signout', authLimiter, authController.logout);
router.post('/logout', authLimiter, authController.logout); // Alias

// ==========================================
// PROTECTED ROUTES (require authentication)
// ==========================================

router.get('/me', authenticate, authController.getMe);
router.post('/change-password', authenticate, authController.changePassword);
router.post('/link/google', authenticate, authController.linkGoogle);
router.post('/link/apple', authenticate, authController.linkApple);

module.exports = router;

// Apple OAuth Token Management
router.post('/apple/token', authController.appleToken);
router.post('/apple/refresh', authController.appleRefresh);
router.post('/apple/revoke', authController.appleRevoke);
