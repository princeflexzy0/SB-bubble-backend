const crypto = require('crypto');
const env = require('../config/env');

/**
 * HMAC Request Signature Validation
 * Prevents replay attacks and ensures request integrity
 * NOW USES SEPARATE HMAC_SECRET (not API key)
 */
const validateHmacSignature = (req, res, next) => {
  try {
    const signature = req.headers['x-signature'];
    const timestamp = req.headers['x-timestamp'];

    // Check required headers
    if (!signature) {
      return res.status(401).json({
        status: 'error',
        code: 401,
        message: 'Missing x-signature header (HMAC signature required)'
      });
    }

    if (!timestamp) {
      return res.status(401).json({
        status: 'error',
        code: 401,
        message: 'Missing x-timestamp header'
      });
    }

    // Check if HMAC secret is configured
    if (!env.INTERNAL_HMAC_SECRET) {
      // console.error('CRITICAL: INTERNAL_HMAC_SECRET not configured!');
      return res.status(500).json({
        status: 'error',
        code: 500,
        message: 'Server configuration error'
      });
    }

    // Validate timestamp (prevent replay attacks - 5 minute window)
    const requestTime = parseInt(timestamp);
    const currentTime = Date.now();
    const timeDiff = Math.abs(currentTime - requestTime);
    
    if (timeDiff > 5 * 60 * 1000) { // 5 minutes
      return res.status(401).json({
        status: 'error',
        code: 401,
        message: 'Request timestamp expired (max 5 minutes). Possible replay attack.'
      });
    }

    // Create signature payload
    const method = req.method;
    const path = req.originalUrl;
    const body = req.body ? JSON.stringify(req.body) : '';
    
    const payload = `${method}${path}${timestamp}${body}`;

    // Generate HMAC signature using SEPARATE secret
    const expectedSignature = crypto
      .createHmac('sha256', env.INTERNAL_HMAC_SECRET)
      .update(payload)
      .digest('hex');

    // Compare signatures (timing-safe comparison)
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (signatureBuffer.length !== expectedBuffer.length) {
      return res.status(403).json({
        status: 'error',
        code: 403,
        message: 'Invalid HMAC signature'
      });
    }

    if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
      return res.status(403).json({
        status: 'error',
        code: 403,
        message: 'Invalid HMAC signature'
      });
    }

    // Signature valid
    next();
  } catch (error) {
    // console.error('HMAC validation error:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Signature validation error'
    });
  }
};

module.exports = {
  validateHmacSignature
};
