const { verifyAccessToken } = require('../utils/jwt.util');
const { query } = require('../config/database');
const { createLogger } = require('../config/monitoring');

const logger = createLogger('auth-middleware');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);

    const result = await query('SELECT * FROM users WHERE id = $1', [decoded.userId]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
      });
    }

    req.user = result.rows[0];
    req.userId = decoded.userId;

    next();
  } catch (error) {
    logger.error('Authentication failed', { error: error.message });
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
};

const requireValidKYC = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const kycResult = await query(
      `SELECT ks.*, kd.id_expiry
       FROM kyc_sessions ks
       LEFT JOIN kyc_documents kd ON ks.id = kd.kyc_session_id
       WHERE ks.user_id = $1 AND ks.status = 'approved'
       ORDER BY ks.created_at DESC
       LIMIT 1`,
      [req.userId]
    );

    if (kycResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'KYC verification required',
        code: 'KYC_NOT_VERIFIED',
      });
    }

    const kycSession = kycResult.rows[0];

    if (kycSession.id_expiry && new Date(kycSession.id_expiry) < new Date()) {
      return res.status(403).json({
        success: false,
        error: 'ID document expired. Please upload a new document.',
        code: 'KYC_DOCUMENT_EXPIRED',
      });
    }

    req.kycSession = kycSession;
    next();
  } catch (error) {
    logger.error('KYC check failed', { error: error.message, userId: req.userId });
    return res.status(500).json({
      success: false,
      error: 'Failed to verify KYC status',
    });
  }
};

module.exports = {
  authenticate,
  requireValidKYC,
};
