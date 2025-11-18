const express = require('express');
const router = express.Router();

// Simple health route
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Root API info
router.get('/', (req, res) => {
  res.json({
    message: 'Bubble Backend API v1.0.0',
    status: 'operational',
    endpoints: {
      health: '/api/v1/health'
    }
  });
});

// Catch all
router.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

module.exports = router;
