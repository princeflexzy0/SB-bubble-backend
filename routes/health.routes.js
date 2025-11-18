const express = require('express');
const router = express.Router();
const { getRedisClient } = require('../config/redis');
const { createClient } = require('@supabase/supabase-js');
const AWS = require('aws-sdk');
const env = require('../config/env');

/**
 * Basic health check
 */
router.get('/', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
    version: '1.0.0'
  };
  
  // Check if extended checks requested
  if (req.query.detailed === 'true') {
    health.checks = await performDetailedChecks();
  } else {
    // Quick database check
    health.database = await quickDbCheck();
  }
  
  // Overall health status
  if (req.query.detailed === 'true' && health.checks) {
    const allHealthy = Object.values(health.checks).every(check => check.status === 'healthy');
    health.status = allHealthy ? 'healthy' : 'degraded';
  }
  
  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

/**
 * Quick database check
 */
async function quickDbCheck() {
  try {
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    const { data, error } = await supabase.from('users').select('count').limit(1);
    return error ? 'unhealthy' : 'healthy';
  } catch (error) {
    return 'unhealthy';
  }
}

/**
 * Detailed health checks for all services
 */
async function performDetailedChecks() {
  const checks = {};
  
  // Database check
  checks.database = await checkDatabase();
  
  // Redis check
  checks.redis = await checkRedis();
  
  // S3 check
  checks.s3 = await checkS3();
  
  // Memory check
  checks.memory = checkMemory();
  
  return checks;
}

/**
 * Check database connection
 */
async function checkDatabase() {
  try {
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    const start = Date.now();
    const { error } = await supabase.from('users').select('count').limit(1);
    const responseTime = Date.now() - start;
    
    return {
      status: error ? 'unhealthy' : 'healthy',
      responseTime: `${responseTime}ms`,
      message: error ? error.message : 'Connected'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error.message
    };
  }
}

/**
 * Check Redis connection
 */
async function checkRedis() {
  try {
    const redis = getRedisClient();
    const start = Date.now();
    await redis.ping();
    const responseTime = Date.now() - start;
    
    return {
      status: 'healthy',
      responseTime: `${responseTime}ms`,
      message: 'Connected'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error.message || 'Not configured'
    };
  }
}

/**
 * Check S3 connection
 */
async function checkS3() {
  try {
    const s3 = new AWS.S3({
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      region: env.AWS_REGION
    });
    
    const start = Date.now();
    await s3.headBucket({ Bucket: env.S3_BUCKET_NAME }).promise();
    const responseTime = Date.now() - start;
    
    return {
      status: 'healthy',
      responseTime: `${responseTime}ms`,
      message: 'Bucket accessible'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error.message
    };
  }
}

/**
 * Check memory usage
 */
function checkMemory() {
  const used = process.memoryUsage();
  const totalMB = Math.round(used.heapTotal / 1024 / 1024);
  const usedMB = Math.round(used.heapUsed / 1024 / 1024);
  const percentage = Math.round((usedMB / totalMB) * 100);
  
  return {
    status: percentage > 90 ? 'warning' : 'healthy',
    total: `${totalMB}MB`,
    used: `${usedMB}MB`,
    percentage: `${percentage}%`
  };
}

module.exports = router;
