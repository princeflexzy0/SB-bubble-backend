const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('../config/redis');
const env = require('../config/env');

/**
 * Redis-Based Brute Force Protection (FIX #10)
 * Provides distributed brute force detection with lockout
 */

// Get Redis store if available (not in test mode)
function getStore(prefix) {
  // Skip Redis in test mode
  if (env.NODE_ENV === 'test') {
    return undefined; // Use memory store
  }
  
  if (redis && typeof redis.get === "function") {
    try {
      return new RedisStore({
        client: redis,
        prefix: prefix
      });
    } catch (error) {
      console.warn('⚠️  Redis store creation failed, using memory store');
      return undefined;
    }
  }
  
  console.warn('⚠️  Redis unavailable - brute force protection using memory (not distributed)');
  return undefined; // Falls back to memory store
}

/**
 * Login brute force protection
 * 5 attempts, 30-minute lockout
 */
const loginBruteForce = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 5,
  message: 'Too many login attempts, please try again after 30 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore('login-bf:')
});

/**
 * Password reset brute force protection
 * 3 attempts, 1-hour lockout
 */
const passwordResetBruteForce = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many password reset attempts, please try again after 1 hour',
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore('reset-bf:')
});

/**
 * Signup brute force protection
 * 10 attempts, 1-hour lockout
 */
const signupBruteForce = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many signup attempts, please try again after 1 hour',
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore('signup-bf:')
});

module.exports = {
  loginBruteForce,
  passwordResetBruteForce,
  signupBruteForce
};
