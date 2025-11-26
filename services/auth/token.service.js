const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { query } = require('../../config/database');
const { createLogger } = require('../../config/monitoring');

const logger = createLogger('token-service');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';

/**
 * Hash token with SHA-256 for secure storage
 */
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Generate access token (short-lived)
 */
const generateAccessToken = (userId, email) => {
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
};

/**
 * Generate refresh token (long-lived)
 */
const generateRefreshToken = (userId, email) => {
  return jwt.sign(
    { userId, email },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
};

/**
 * Store refresh token (HASHED)
 */
const storeRefreshToken = async (userId, refreshToken, ipAddress, userAgent) => {
  try {
    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent, revoked)
       VALUES ($1, $2, $3, $4, $5, false)`,
      [userId, tokenHash, expiresAt, ipAddress, userAgent]
    );

    logger.info('Refresh token stored (hashed)', { userId });
  } catch (error) {
    logger.error('Store refresh token failed', { error: error.message });
    throw error;
  }
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = async (refreshToken) => {
  try {
    // Verify JWT signature first
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    
    // Hash and check in database
    const tokenHash = hashToken(refreshToken);
    
    const result = await query(
      `SELECT * FROM refresh_tokens 
       WHERE token_hash = $1 
       AND revoked = false 
       AND expires_at > NOW()`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid or expired refresh token');
    }

    return decoded;
  } catch (error) {
    logger.error('Verify refresh token failed', { error: error.message });
    throw error;
  }
};

/**
 * Revoke refresh token (mark as revoked, don't delete)
 */
const revokeRefreshToken = async (refreshToken, reason = 'user_logout') => {
  try {
    const tokenHash = hashToken(refreshToken);
    
    await query(
      `UPDATE refresh_tokens 
       SET revoked = true, revoked_at = NOW() 
       WHERE token_hash = $1`,
      [tokenHash]
    );

    // Audit log
    await query(
      `INSERT INTO kyc_audit_logs (user_id, action, details, timestamp)
       VALUES (
         (SELECT user_id FROM refresh_tokens WHERE token_hash = $1 LIMIT 1),
         'token_revoked',
         $2,
         NOW()
       )`,
      [tokenHash, JSON.stringify({ reason })]
    );

    logger.info('Refresh token revoked', { reason });
  } catch (error) {
    logger.error('Revoke refresh token failed', { error: error.message });
    throw error;
  }
};

/**
 * Rotate refresh token (revoke old, issue new)
 */
const rotateRefreshToken = async (oldRefreshToken, userId, email, ipAddress, userAgent) => {
  try {
    // Revoke old token
    await revokeRefreshToken(oldRefreshToken, 'token_rotation');

    // Generate new tokens
    const newAccessToken = generateAccessToken(userId, email);
    const newRefreshToken = generateRefreshToken(userId, email);

    // Store new refresh token
    await storeRefreshToken(userId, newRefreshToken, ipAddress, userAgent);

    logger.info('Token rotated', { userId });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
  } catch (error) {
    logger.error('Token rotation failed', { error: error.message });
    throw error;
  }
};

module.exports = {
  hashToken,
  generateAccessToken,
  generateRefreshToken,
  storeRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  rotateRefreshToken
};
