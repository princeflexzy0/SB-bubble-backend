const express = require('express');
const router = express.Router();

// Import all route modules FIRST
const authRoutes = require('./auth/auth.routes');
const userRoutes = require('./user.routes');
const kycRoutes = require('./kyc/kyc.routes');
const paymentRoutes = require('./payment/payment.routes');
// const catalogRoutes = require('./catalog.routes');
const adminRoutes = require('./admin/admin.routes');
const workflowRoutes = require('./workflow.routes');
const aiRoutes = require('./ai.routes');
const uploadRoutes = require('./upload.routes');

// Health check (no auth required)
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    database: 'healthy'
  });
});

// Mount all routes AFTER imports
router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/kyc', kycRoutes);
router.use('/payment', paymentRoutes);
// router.use('/catalog', catalogRoutes);
router.use('/admin', adminRoutes);
router.use('/workflow', workflowRoutes);
router.use('/ai', aiRoutes);
router.use('/upload', uploadRoutes);

module.exports = router;
