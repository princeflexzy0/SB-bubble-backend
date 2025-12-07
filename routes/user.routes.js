const { authenticate } = require('../middleware/auth.middleware');
const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { validateUpdateProfile, validateDeactivate } = require('../validation/user.validation');
const { auditLog, SENSITIVE_ACTIONS } = require('../middleware/auditLog.middleware');
const rateLimit = require('express-rate-limit');

// Rate limiter for sensitive operations
const sensitiveOpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: {
    status: 'error',
    code: 429,
    message: 'Too many attempts. Please try again later.'
  }
});

/**
 * @route   GET /api/v1/user/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', authenticate, userController.getProfile);

/**
 * @route   PUT /api/v1/user/profile
 * @desc    Update user profile (with validation, sanitization & audit logging)
 * @access  Private
 */
router.put('/profile', 
  validateUpdateProfile,
  auditLog(SENSITIVE_ACTIONS.PROFILE_UPDATED, 'user'),
  userController.updateProfile
);

/**
 * @route   GET /api/v1/user/stats
 * @desc    Get user statistics
 * @access  Private
 */
router.get('/stats', userController.getStats);

/**
 * @route   DELETE /api/v1/user/deactivate
 * @desc    Deactivate user account (with validation, rate limiting & audit logging)
 * @access  Private
 */
router.delete('/deactivate', 
  sensitiveOpLimiter,
  validateDeactivate,
  auditLog(SENSITIVE_ACTIONS.ACCOUNT_DEACTIVATED, 'user'),
  userController.deactivate
);

module.exports = router;
