const crypto = require('crypto');
const { createLogger } = require('../config/monitoring');
const logger = createLogger('hmac-middleware');

// Public routes that don't require HMAC validation
const PUBLIC_ROUTES = [
  '/api/v1/health',
  '/api/v1/auth/register',
  '/api/v1/auth/login',
  '/api/v1/auth/magic-link',
  '/api/v1/auth/verify-magic-link',
  '/api/v1/auth/reset-password',
  '/api/v1/auth/confirm-reset',
  '/api/v1/auth/google/callback',
  '/api/v1/auth/apple/callback',
  '/api/v1/auth/apple/start',
  '/api/v1/catalog/items',
  '/api/v1/catalog/items/:id'
];

// Check if route is public
const isPublicRoute = (path, method) => {
  // Exact match
  if (PUBLIC_ROUTES.includes(path)) {
    return true;
  }
  
  // Pattern match (for routes with params like /items/:id)
  for (const route of PUBLIC_ROUTES) {
    if (route.includes(':')) {
      const pattern = route.replace(/:[^/]+/g, '[^/]+');
      const regex = new RegExp(`^${pattern}$`);
      if (regex.test(path)) {
        return true;
      }
    }
  }
  
  // GET requests to catalog are public
  if (method === 'GET' && path.startsWith('/api/v1/catalog')) {
    return true;
  }
  
  return false;
};

const validateHmacSignature = (req, res, next) => {
  // Skip HMAC for public routes
  if (isPublicRoute(req.path, req.method)) {
    logger.debug('Public route - skipping HMAC', { path: req.path });
    return next();
  }

  const signature = req.headers['x-hmac-signature'];
  const timestamp = req.headers['x-timestamp'];
  const apiKey = req.headers['x-api-key'];

  if (!signature || !timestamp || !apiKey) {
    logger.warn('Missing HMAC headers', {
      path: req.path,
      hasSignature: !!signature,
      hasTimestamp: !!timestamp,
      hasApiKey: !!apiKey
    });

    return res.status(401).json({
      success: false,
      error: 'Missing required security headers'
    });
  }

  // Check timestamp (prevent replay attacks)
  const requestTime = parseInt(timestamp);
  const currentTime = Date.now();
  const timeDiff = Math.abs(currentTime - requestTime);
  
  // Allow 5 minute window
  if (timeDiff > 300000) {
    logger.warn('HMAC timestamp expired', {
      path: req.path,
      timeDiff: timeDiff / 1000
    });

    return res.status(401).json({
      success: false,
      error: 'Request timestamp expired'
    });
  }

  try {
    // Get request body
    const body = req.body ? JSON.stringify(req.body) : '';
    
    // Create signature string: METHOD:PATH:TIMESTAMP:BODY
    const signatureString = `${req.method}:${req.path}:${timestamp}:${body}`;
    
    // Calculate expected signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.HMAC_SECRET || 'default-secret')
      .update(signatureString)
      .digest('hex');

    // Compare signatures (timing-safe)
    if (!crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )) {
      logger.warn('Invalid HMAC signature', {
        path: req.path,
        method: req.method
      });

      return res.status(401).json({
        success: false,
        error: 'Invalid request signature'
      });
    }

    logger.debug('HMAC signature valid', { path: req.path });
    next();
  } catch (error) {
    logger.error('HMAC validation error', {
      error: error.message,
      path: req.path
    });

    return res.status(500).json({
      success: false,
      error: 'Signature validation failed'
    });
  }
};

module.exports = { validateHmacSignature, PUBLIC_ROUTES, isPublicRoute };
