const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authLimiter } = require('../middleware/security');
const { validate, schemas } = require('../middleware/validation');

/**
 * @route   POST /api/v1/auth/signup
 * @desc    Register new user
 * @access  Public
 */
router.post('/signup', authLimiter, validate(schemas.signup), authController.signUp);

/**
 * @route   POST /api/v1/auth/signin
 * @desc    Sign in user
 * @access  Public
 */
router.post('/signin', authLimiter, validate(schemas.signin), authController.signIn);

/**
 * @route   POST /api/v1/auth/signout
 * @desc    Sign out user
 * @access  Private
 */
router.post('/signout', authController.signOut);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', authController.refreshToken);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/reset-password', authLimiter, authController.resetPassword);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', authController.getMe);

module.exports = router;
