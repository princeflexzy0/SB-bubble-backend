const express = require('express');
const router = express.Router();

// Import REAL middleware
const { authenticate } = require('../middleware/auth.middleware');
const { validateApiKey } = require('../middleware/security');

// Import route modules
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const fileRoutes = require('./file.routes');
const paymentRoutes = require('./payment.routes');
// const messagingRoutes = require('./messaging.routes');
const aiRoutes = require('./ai.routes');
const workflowRoutes = require('./workflow.routes');
const healthRoutes = require('./health.routes');

// Root API info
router.get('/', (req, res) => {
  res.json({
    message: 'Bubble Backend API v1.0.0',
    status: 'operational',
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

// Health check (public)
router.use('/health', healthRoutes);

// Auth routes (public - but requires API key for signup/signin)
router.use('/auth', authRoutes);

// Protected routes (require BOTH API key AND JWT authentication)
router.use('/user', validateApiKey, authenticate, userRoutes);
router.use('/files', validateApiKey, authenticate, fileRoutes);
router.use('/pay', validateApiKey, authenticate, paymentRoutes);
// router.use("/msg", messagingRoutes););
router.use('/ai', validateApiKey, authenticate, aiRoutes);
router.use('/flow', validateApiKey, authenticate, workflowRoutes);

// 404 handler
router.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
    path: req.originalUrl
  });
});

module.exports = router;
