const Redis = require('ioredis');
const env = require('./env');

let redisClient = null;
let isRedisAvailable = false;

function initRedis() {
  if (env.NODE_ENV === 'test' && !env.REDIS_URL) {
    // console.log('ℹ️  Test mode: Redis disabled');
    return null;
  }

  if (!env.REDIS_URL) {
    console.warn('⚠️  REDIS_URL not configured - running without Redis');
    return null;
  }

  try {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) {
          // console.error('❌ Redis connection failed after 3 retries');
          return null;
        }
        return Math.min(times * 200, 1000);
      },
    });

    redisClient.on('connect', () => {
      isRedisAvailable = true;
      // console.log('✅ Redis connected');
    });

    redisClient.on('error', (err) => {
      isRedisAvailable = false;
      // console.error('Redis error:', err.message);
    });

    return redisClient;
  } catch (error) {
    // console.error('Failed to initialize Redis:', error.message);
    return null;
  }
}

function getRedisClient() {
  if (env.NODE_ENV === 'test') {
    return {
      get: () => Promise.resolve(null),
      set: () => Promise.resolve('OK'),
      setex: () => Promise.resolve('OK'),
      del: () => Promise.resolve(1),
      disconnect: () => Promise.resolve(),
    };
  }

  if (!redisClient || !isRedisAvailable) {
    console.warn('⚠️  Redis not available - operations will be skipped');
    return null;
  }

  return redisClient;
}

async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    // console.log('Redis connection closed');
  }
}

if (env.NODE_ENV !== 'test') {
  initRedis();
}

// PROPER EXPORTS
module.exports = {
  getRedisClient,
  closeRedis,
  isAvailable: () => isRedisAvailable
};
