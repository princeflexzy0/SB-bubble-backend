const { createLogger } = require('../config/monitoring');

const logger = createLogger('redis-check');

/**
 * Ensure Redis is available in production
 */
const ensureRedis = (req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !process.env.REDIS_URL) {
    logger.error('CRITICAL: Redis not configured in production');
    return res.status(503).json({ 
      error: 'Service temporarily unavailable',
      message: 'Redis required in production'
    });
  }

  // Check if Redis client is connected
  const redisClient = req.app.get('redisClient');
  
  if (process.env.NODE_ENV === 'production' && process.env.REDIS_MANDATORY === 'true') {
    if (!redisClient || !redisClient.isReady) {
      logger.error('Redis not connected in production');
      return res.status(503).json({ 
        error: 'Service temporarily unavailable',
        message: 'Cache service unavailable'
      });
    }
  }

  next();
};

module.exports = { ensureRedis };
