const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { getRedisClient } = require('../config/redis');

let store;
try {
  const redisClient = getRedisClient();
  store = new RedisStore({
    client: redisClient,
    prefix: 'rl:',
  });
  if (process.env.NODE_ENV === 'production') {
    // console.log('✅ Using Redis for rate limiting');
  }
} catch (error) {
  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️  Redis not available, using memory store for rate limiting');
  }
  store = undefined;
}

const generalLimiter = rateLimit({
  store: store,
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    status: 'error',
    code: 429,
    message: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  store: store,
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    status: 'error',
    code: 429,
    message: 'Too many authentication attempts, please try again later'
  },
  skipSuccessfulRequests: true
});

const paymentLimiter = rateLimit({
  store: store,
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    status: 'error',
    code: 429,
    message: 'Too many payment requests, please try again later'
  }
});

const aiLimiter = rateLimit({
  store: store,
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    status: 'error',
    code: 429,
    message: 'Too many AI requests, please try again later'
  }
});

const uploadLimiter = rateLimit({
  store: store,
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: {
    status: 'error',
    code: 429,
    message: 'Too many file uploads, please try again later'
  }
});

/**
 * API Key Validation with Rotation Support (FIX #9)
 * Supports multiple API keys for zero-downtime rotation
 */
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const env = require('../config/env');
  
  if (!apiKey) {
    return res.status(401).json({
      status: 'error',
      code: 401,
      message: 'API key is required (x-api-key header)'
    });
  }
  
  // Support multiple API keys for rotation
  const validKeys = [
    env.INTERNAL_API_KEY,
    env.INTERNAL_API_KEY_V1, // Old key during rotation
    env.INTERNAL_API_KEY_V2  // New key during rotation
  ].filter(Boolean); // Remove undefined keys

  if (!validKeys.includes(apiKey)) {
    return res.status(403).json({
      status: 'error',
      code: 403,
      message: 'Invalid API key'
    });
  }
  
  // Log which key version was used (for rotation monitoring)
  if (apiKey === env.INTERNAL_API_KEY_V1) {
    console.warn('⚠️  Old API key (V1) used - consider rotating clients');
  }
  
  next();
};

module.exports = {
  generalLimiter,
  authLimiter,
  paymentLimiter,
  aiLimiter,
  uploadLimiter,
  validateApiKey
};
