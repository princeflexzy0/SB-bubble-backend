const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY || '15m';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

const generateAccessToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
    issuer: 'bubble-backend-api',
    audience: 'bubble-users',
  });
};

const generateRefreshToken = async (userId, metadata = {}) => {
  const tokenFamily = crypto.randomUUID();
  const refreshToken = crypto.randomBytes(64).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await query(
    `INSERT INTO refresh_tokens 
     (user_id, token_hash, token_family, ip_address, user_agent, device_fingerprint, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [userId, tokenHash, tokenFamily, metadata.ipAddress || null, metadata.userAgent || null, metadata.deviceFingerprint || null, expiresAt]
  );

  return { refreshToken, tokenFamily };
};

const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'bubble-backend-api',
      audience: 'bubble-users',
    });
  } catch (error) {
    throw new Error(`Invalid access token: ${error.message}`);
  }
};

const verifyRefreshToken = async (refreshToken) => {
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const result = await query(
    `SELECT * FROM refresh_tokens WHERE token_hash = $1 AND is_revoked = FALSE AND expires_at > NOW()`,
    [tokenHash]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid or expired refresh token');
  }

  await query(`UPDATE refresh_tokens SET last_used_at = NOW() WHERE token_hash = $1`, [tokenHash]);
  return result.rows[0];
};

const revokeRefreshToken = async (refreshToken, reason = 'manual_revoke') => {
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await query(
    `UPDATE refresh_tokens SET is_revoked = TRUE, revoked_at = NOW(), revoke_reason = $1 WHERE token_hash = $2`,
    [reason, tokenHash]
  );
};

const revokeAllUserTokens = async (userId) => {
  await query(
    `UPDATE refresh_tokens SET is_revoked = TRUE, revoked_at = NOW(), revoke_reason = 'logout_all' WHERE user_id = $1 AND is_revoked = FALSE`,
    [userId]
  );
};

const generateTokenPair = async (user, metadata = {}) => {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role || 'user',
  };

  const accessToken = generateAccessToken(payload);
  const { refreshToken } = await generateRefreshToken(user.id, metadata);

  return { accessToken, refreshToken };
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  generateTokenPair,
};
