const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth/auth.controller');
const { authLimiter } = require('../middleware/security');
const { loginBruteForce, passwordResetBruteForce, signupBruteForce } = require('../middleware/bruteForce.middleware');
const { auditLog, SENSITIVE_ACTIONS } = require('../middleware/auditLog.middleware');
const { csrfProtection, getCsrfToken } = require('../middleware/csrf.middleware');

/**
 * @route   GET /api/v1/auth/csrf-token
 * @desc    Get CSRF token for forms
 * @access  Public
 */
router.get('/csrf-token', csrfProtection, getCsrfToken);

/**
 * @route   POST /api/v1/auth/signup
 * @desc    User signup (with brute force protection & audit logging)
 * @access  Public
 */
router.post('/signup', 
  signupBruteForce, 
  auditLog(SENSITIVE_ACTIONS.ACCOUNT_CREATED, 'user'),
  authController.signUp
);

/**
 * @route   POST /api/v1/auth/signin
 * @desc    User signin (with brute force protection)
 * @access  Public
 */
router.post('/signin', 
  loginBruteForce,
  authController.signIn
);

/**
 * @route   POST /api/v1/auth/signout
 * @desc    User signout
 * @access  Public
 */
router.post('/signout', authLimiter, authController.signOut);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Request password reset (with brute force protection & audit logging)
 * @access  Public
 */
router.post('/reset-password', 
  passwordResetBruteForce,
  auditLog(SENSITIVE_ACTIONS.PASSWORD_CHANGED, 'user'),
  authController.resetPassword
);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', authLimiter, authController.refreshToken);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', authController.getMe);

module.exports = router;
