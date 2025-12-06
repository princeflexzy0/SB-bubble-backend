const jwksClient = require('jwks-rsa');
const NodeCache = require('node-cache');
const { createLogger } = require('../../config/monitoring');
const logger = createLogger('apple-jwks');

// Cache for JWKS (24 hour TTL)
const jwksCache = new NodeCache({ stdTTL: 86400 });
let lastValidJWKS = null;

const client = jwksClient({
  jwksUri: 'https://appleid.apple.com/auth/keys',
  cache: true,
  cacheMaxAge: 86400000, // 24 hours
  timeout: 5000 // 5 second timeout
});

/**
 * Get Apple signing key with error handling and fallback
 */
async function getKey(header) {
  try {
    const cached = jwksCache.get(header.kid);
    if (cached) {
      logger.info('Using cached JWKS', { kid: header.kid });
      return cached;
    }

    // Try to get key from Apple
    const key = await client.getSigningKey(header.kid);
    const publicKey = key.getPublicKey();
    
    // Cache the key
    jwksCache.set(header.kid, publicKey);
    lastValidJWKS = publicKey;
    
    logger.info('Fetched fresh JWKS from Apple', { kid: header.kid });
    return publicKey;

  } catch (error) {
    logger.error('Failed to fetch JWKS from Apple', { 
      error: error.message, 
      kid: header.kid 
    });

    // Try to use last valid JWKS as fallback
    if (lastValidJWKS) {
      logger.warn('Using fallback JWKS (stale cache)', { kid: header.kid });
      return lastValidJWKS;
    }

    // Try to refresh cache
    try {
      logger.info('Attempting to refresh JWKS cache');
      const key = await client.getSigningKey(header.kid);
      const publicKey = key.getPublicKey();
      lastValidJWKS = publicKey;
      return publicKey;
    } catch (refreshError) {
      logger.error('JWKS refresh failed', { error: refreshError.message });
      throw new Error('Unable to verify Apple token: JWKS unavailable');
    }
  }
}

module.exports = { getKey };
