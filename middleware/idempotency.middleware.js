const { createLogger } = require('../config/monitoring');
const { pool } = require('../config/database');
const logger = createLogger('idempotency-middleware');

/**
 * Idempotency middleware for Stripe operations
 * Prevents duplicate charges by checking idempotency-key header
 */
const checkIdempotency = async (req, res, next) => {
  const idempotencyKey = req.headers['idempotency-key'];
  
  // Skip if no idempotency key provided
  if (!idempotencyKey) {
    return next();
  }

  try {
    // Check if this key was used before
    const result = await pool.query(
      `SELECT response_status, response_body, created_at 
       FROM idempotency_keys 
       WHERE idempotency_key = $1 AND expires_at > NOW()`,
      [idempotencyKey]
    );

    if (result.rows.length > 0) {
      // Key exists - return cached response
      const cached = result.rows[0];
      
      logger.info('Idempotency key matched - returning cached response', {
        key: idempotencyKey,
        cachedAt: cached.created_at
      });

      return res
        .status(cached.response_status || 200)
        .json(cached.response_body);
    }

    // Key is new - store it for this request
    req.idempotencyKey = idempotencyKey;
    req.userId = req.user?.id;
    
    // Intercept res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = async function(body) {
      // Store the response
      try {
        await pool.query(
          `INSERT INTO idempotency_keys 
           (idempotency_key, user_id, request_path, request_method, response_status, response_body)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (idempotency_key) DO NOTHING`,
          [
            req.idempotencyKey,
            req.userId,
            req.path,
            req.method,
            res.statusCode,
            body
          ]
        );

        logger.info('Stored idempotency key', {
          key: req.idempotencyKey,
          path: req.path
        });
      } catch (err) {
        logger.error('Failed to store idempotency key', {
          error: err.message,
          key: req.idempotencyKey
        });
      }

      return originalJson(body);
    };

    next();
  } catch (error) {
    logger.error('Idempotency check failed', {
      error: error.message,
      key: idempotencyKey
    });
    next(error);
  }
};

module.exports = { checkIdempotency };
