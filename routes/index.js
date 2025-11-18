const express = require('express');
const router = express.Router();
const { validateApiKey } = require('../middleware/security');
const authService = require('../services/auth.service');
const { AppError } = require('../middleware/errorHandler');

// Import route modules
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const fileRoutes = require('./file.routes');
const paymentRoutes = require('./payment.routes');
const messagingRoutes = require('./messaging.routes');
const aiRoutes = require('./ai.routes');
const workflowRoutes = require('./workflow.routes');
const healthRoutes = require('./health.routes');

// Authentication middleware for protected routes
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      throw new AppError('Authentication required', 401);
    }
    
    const user = await authService.getUserByToken(token);
    req.user = user;
    next();
  } catch (error) {
    next(new AppError('Invalid or expired token', 401));
  }
};

// Root API info
router.get('/', (req, res) => {
  res.json({
    message: 'Bubble Backend API v1.0.0',
    status: 'operational',
    documentation: '/api/v1/api-docs',
    endpoints: {
      health: '/api/v1/health',
      auth: '/api/v1/auth',
      users: '/api/v1/user',
      files: '/api/v1/files',
      payments: '/api/v1/pay',
      messaging: '/api/v1/msg',
      ai: '/api/v1/ai',
      workflows: '/api/v1/flow'
    }
  });
});

// Health check (public - no authentication required)
router.use('/health', healthRoutes);

// Auth routes (public with rate limiting)
router.use('/auth', authRoutes);

// Apply API key validation to all other routes
router.use(validateApiKey);

// Apply authentication to all protected routes
router.use(authenticate);

// Protected routes (require both API key and user authentication)
router.use('/user', userRoutes);
router.use('/files', fileRoutes);
router.use('/pay', paymentRoutes);
router.use('/msg', messagingRoutes);
router.use('/ai', aiRoutes);
router.use('/flow', workflowRoutes);

// 404 handler for undefined API routes
router.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    code: 404,
    message: 'API route not found',
    path: req.originalUrl,
    hint: 'Check /api/v1/api-docs for available endpoints'
  });
});

module.exports = router;
