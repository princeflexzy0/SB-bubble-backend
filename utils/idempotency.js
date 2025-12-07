const { getRedisClient, isRedisHealthy } = require('../config/redis');

/**
 * Redis-Based Idempotency for Payments & Webhooks (FIX #11)
 * Prevents duplicate processing across multiple servers
 */

// In-memory fallback (not recommended for production)
const memoryCache = new Map();

/**
 * Idempotency middleware
 */
const ensureIdempotency = (ttlSeconds = 86400) => {
  return async (req, res, next) => {
    try {
      const idempotencyKey = req.headers['x-idempotency-key'];

      if (!idempotencyKey) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'Missing x-idempotency-key header (required for this operation)'
        });
      }

      // Validate key format
      if (!/^[a-zA-Z0-9_-]{16,128}$/.test(idempotencyKey)) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'Invalid idempotency key format (16-128 alphanumeric chars)'
        });
      }

      const key = `idempotency:${idempotencyKey}`;

      // Try to use Redis
      if (isRedisHealthy()) {
        const redis = getRedisClient();
        
        // Check if already processed
        const cached = await redis.get(key);
        
        if (cached) {
          const cachedResponse = JSON.parse(cached);
          // console.log(`✅ Idempotency hit: ${idempotencyKey} (returning cached response)`);
          return res.status(cachedResponse.statusCode).json(cachedResponse.body);
        }

        // Store original res.json
        const originalJson = res.json.bind(res);
        
        res.json = function(body) {
          const response = {
            statusCode: res.statusCode,
            body: body
          };
          
          // Cache in Redis
          redis.setex(key, ttlSeconds, JSON.stringify(response)).catch(err => {
            // console.error('Failed to cache idempotent response:', err);
          });
          
          return originalJson(body);
        };

        next();
      } else {
        // Fallback to memory (WARNING: not distributed)
        console.warn('⚠️  Using memory for idempotency - not distributed!');
        
        if (memoryCache.has(key)) {
          const cachedResponse = memoryCache.get(key);
          // console.log(`✅ Idempotency hit (memory): ${idempotencyKey}`);
          return res.status(cachedResponse.statusCode).json(cachedResponse.body);
        }

        const originalJson = res.json.bind(res);
        
        res.json = function(body) {
          const response = {
            statusCode: res.statusCode,
            body: body
          };
          
          memoryCache.set(key, response);
          
          // Clean up after TTL
          setTimeout(() => memoryCache.delete(key), ttlSeconds * 1000);
          
          return originalJson(body);
        };

        next();
      }
    } catch (error) {
      // console.error('Idempotency middleware error:', error);
      next();
    }
  };
};

/**
 * Webhook-specific idempotency (for preventing duplicate webhook processing)
 */
const ensureWebhookIdempotency = async (webhookId, ttlSeconds = 86400) => {
  const key = `webhook:${webhookId}`;

  if (isRedisHealthy()) {
    const redis = getRedisClient();
    
    // Try to set the key (returns 1 if new, 0 if exists)
    const result = await redis.set(key, '1', 'EX', ttlSeconds, 'NX');
    
    if (result === null) {
      // Key already exists - duplicate webhook
      console.warn(`⚠️  Duplicate webhook detected: ${webhookId}`);
      return false; // Already processed
    }
    
    // console.log(`✅ New webhook: ${webhookId}`);
    return true; // New webhook
  } else {
    console.warn('⚠️  Redis unavailable - cannot check webhook idempotency!');
    // In production, you might want to reject if Redis is down
    return true; // Allow processing (risky)
  }
};

module.exports = {
  ensureIdempotency,
  ensureWebhookIdempotency
};
