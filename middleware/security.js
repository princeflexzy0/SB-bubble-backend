const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { getRedisClient } = require('../config/redis');

// Try to get Redis client, fall back to memory store
let store;
try {
  const redisClient = getRedisClient();
  store = new RedisStore({
    client: redisClient,
    prefix: 'rl:',
  });
  console.log('✅ Using Redis for rate limiting');
} catch (error) {
  console.warn('⚠️ Redis not available, using memory store for rate limiting');
  store = undefined; // Express-rate-limit will use memory store
}

// General rate limiter
const generalLimiter = rateLimit({
  store: store,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    status: 'error',
    code: 429,
    message: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for auth endpoints
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

// Payment endpoint limiter
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

// AI endpoint limiter
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

// File upload limiter
const uploadLimiter = rateLimit({
  store: store,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  message: {
    status: 'error',
    code: 429,
    message: 'Too many file uploads, please try again later'
  }
});

// API key validation middleware
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const env = require('../config/env');
  
  if (!apiKey) {
    return res.status(401).json({
      status: 'error',
      code: 401,
      message: 'API key is required'
    });
  }
  
  if (apiKey !== env.INTERNAL_API_KEY) {
    return res.status(403).json({
      status: 'error',
      code: 403,
      message: 'Invalid API key'
    });
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
