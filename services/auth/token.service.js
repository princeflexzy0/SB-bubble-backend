const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../../config/database');
const env = require('../../config/env');

// Hash token for storage
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

class TokenService {
  generateAccessToken(userId) {
    return jwt.sign(
      { userId, type: 'access' },
      env.JWT_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRY }
    );
  }

  generateRefreshToken(userId) {
    return jwt.sign(
      { userId, type: 'refresh', jti: uuidv4() },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRY }
    );
  }

  async storeRefreshToken(userId, refreshToken, ipAddress, userAgent) {
    const hashedToken = hashToken(refreshToken);
    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
    
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent, jti)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, hashedToken, new Date(decoded.exp * 1000), ipAddress, userAgent, decoded.jti]
    );
  }

  async validateRefreshToken(refreshToken) {
    const hashedToken = hashToken(refreshToken);
    const result = await pool.query(
      `SELECT rt.*, u.id as user_id, u.email 
       FROM refresh_tokens rt
       JOIN users u ON rt.user_id = u.id
       WHERE rt.token_hash = $1 
       AND rt.revoked = false 
       AND rt.expires_at > NOW()`,
      [hashedToken]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  }

  async revokeRefreshToken(refreshToken, reason = 'manual_revoke') {
    const hashedToken = hashToken(refreshToken);
    await pool.query(
      `UPDATE refresh_tokens 
       SET revoked = true, revoked_at = NOW(), revoked_reason = $1
       WHERE token_hash = $2`,
      [reason, hashedToken]
    );
  }

  async generateTokenPair(userId, ipAddress, userAgent) {
    const accessToken = this.generateAccessToken(userId);
    const refreshToken = this.generateRefreshToken(userId);
    
    await this.storeRefreshToken(userId, refreshToken, ipAddress, userAgent);
    
    return { accessToken, refreshToken };
  }

  async rotateRefreshToken(oldRefreshToken, ipAddress, userAgent) {
    const tokenData = await this.validateRefreshToken(oldRefreshToken);
    
    if (!tokenData) {
      throw new Error('Invalid or expired refresh token');
    }
    
    await this.revokeRefreshToken(oldRefreshToken, 'token_rotation');
    
    return this.generateTokenPair(tokenData.user_id, ipAddress, userAgent);
  }
}

module.exports = new TokenService();
