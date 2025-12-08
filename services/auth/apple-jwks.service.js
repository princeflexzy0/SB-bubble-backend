const axios = require('axios');
const { createLogger } = require('../../config/monitoring');
const logger = createLogger('apple-jwks');

const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

// In-memory cache
let jwksCache = {
  keys: null,
  fetchedAt: null,
  expiresAt: null
};

/**
 * Fetch Apple's public keys from JWKS endpoint
 * Cached for 12 hours to reduce external calls
 */
async function fetchJWKS() {
  try {
    logger.info('Fetching Apple JWKS');
    
    const response = await axios.get(APPLE_JWKS_URL, {
      timeout: 10000,
      headers: {
        'User-Agent': 'bubble-backend/1.0'
      }
    });

    const now = Date.now();
    jwksCache = {
      keys: response.data.keys,
      fetchedAt: now,
      expiresAt: now + CACHE_TTL
    };

    logger.info('Apple JWKS cached', {
      keyCount: response.data.keys.length,
      expiresIn: '12 hours'
    });

    return response.data.keys;
  } catch (error) {
    logger.error('Failed to fetch Apple JWKS', {
      error: error.message,
      url: APPLE_JWKS_URL
    });
    throw new Error('Could not fetch Apple public keys');
  }
}

/**
 * Get Apple public key by key ID (kid)
 * Uses cached keys if available and not expired
 */
async function getKey(header) {
  const { kid, alg } = header;

  if (!kid) {
    throw new Error('Missing kid in JWT header');
  }

  // Check cache validity
  const now = Date.now();
  const cacheExpired = !jwksCache.keys || 
                       !jwksCache.expiresAt || 
                       jwksCache.expiresAt <= now;

  // Fetch if cache is expired or empty
  if (cacheExpired) {
    logger.info('JWKS cache expired or empty, fetching new keys', {
      cacheAge: jwksCache.fetchedAt ? (now - jwksCache.fetchedAt) / 1000 : null
    });
    
    try {
      await fetchJWKS();
    } catch (fetchError) {
      // If fetch fails but we have old cache, use it as fallback
      if (jwksCache.keys && jwksCache.keys.length > 0) {
        logger.warn('Using stale JWKS cache as fallback', {
          cacheAge: (now - jwksCache.fetchedAt) / 1000
        });
      } else {
        throw fetchError;
      }
    }
  } else {
    const cacheAge = (now - jwksCache.fetchedAt) / 1000;
    const timeToExpiry = (jwksCache.expiresAt - now) / 1000;
    
    logger.debug('Using cached JWKS', {
      cacheAge: `${cacheAge}s`,
      expiresIn: `${timeToExpiry}s`
    });
  }

  // Find the key with matching kid
  const key = jwksCache.keys.find(k => k.kid === kid);

  if (!key) {
    logger.error('Key not found in JWKS', {
      requestedKid: kid,
      availableKids: jwksCache.keys.map(k => k.kid)
    });
    throw new Error(`Key with kid ${kid} not found in JWKS`);
  }

  // Verify algorithm matches
  if (key.alg && key.alg !== alg) {
    throw new Error(`Algorithm mismatch: expected ${alg}, got ${key.alg}`);
  }

  // Convert JWK to PEM format for JWT verification
  const jwkToPem = require('jwk-to-pem');
  const pem = jwkToPem(key);

  logger.debug('Key retrieved successfully', { kid });

  return pem;
}

/**
 * Clear the JWKS cache (useful for testing or forced refresh)
 */
function clearCache() {
  logger.info('Clearing JWKS cache');
  jwksCache = {
    keys: null,
    fetchedAt: null,
    expiresAt: null
  };
}

/**
 * Get cache status (for monitoring/debugging)
 */
function getCacheStatus() {
  if (!jwksCache.keys) {
    return { status: 'empty' };
  }

  const now = Date.now();
  const ageSeconds = (now - jwksCache.fetchedAt) / 1000;
  const ttlSeconds = (jwksCache.expiresAt - now) / 1000;

  return {
    status: ttlSeconds > 0 ? 'valid' : 'expired',
    keyCount: jwksCache.keys.length,
    cacheAge: `${Math.round(ageSeconds)}s`,
    timeToExpiry: `${Math.round(ttlSeconds)}s`,
    fetchedAt: new Date(jwksCache.fetchedAt).toISOString(),
    expiresAt: new Date(jwksCache.expiresAt).toISOString()
  };
}

module.exports = {
  getKey,
  fetchJWKS,
  clearCache,
  getCacheStatus,
  CACHE_TTL
};
