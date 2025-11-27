const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const env = require('../config/env');

/**
 * Basic health check (public)
 */
router.get('/', async (req, res) => {
  // Log every healthcheck request
  console.log('🏥 HEALTHCHECK REQUEST:', {
    time: new Date().toISOString(),
    method: req.method,
    url: req.url,
    ip: req.ip,
    headers: req.headers
  });
  
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
    version: '1.0.0'
  };
  
  // Quick database check
  try {
    await pool.query('SELECT 1');
    health.database = 'healthy';
  } catch (error) {
    health.database = 'unhealthy';
  }
  
  console.log('🏥 HEALTHCHECK RESPONSE:', health);
  
  // ALWAYS return 200
  res.status(200).json(health);
});

module.exports = router;
