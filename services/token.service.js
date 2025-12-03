const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const env = require('../config/env');

class TokenService {
  // Generate access token (short-lived)
  generateAccessToken(userId) {
    return jwt.sign(
      { userId, type: 'access' },
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRY }
    );
  }

  // Generate refresh token (long-lived)
  generateRefreshToken(userId) {
    return jwt.sign(
      { userId, type: 'refresh', jti: uuidv4() },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRY }
    );
  }

  // Store refresh token in database
  async storeRefreshToken(userId, token, ipAddress = null, userAgent = null) {
    try {
      const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(decoded.exp * 1000);
      const tokenFamily = uuidv4(); // Generate token family for rotation

      const query = `
        INSERT INTO refresh_tokens (user_id, token_hash, token_family, expires_at, ip_address, user_agent, revoked)
        VALUES ($1, $2, $3, $4, $5, $6, false)
        RETURNING id
      `;

      const result = await db.query(query, [
        userId,
        tokenHash,
        tokenFamily,
        expiresAt,
        ipAddress,
        userAgent
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('[token-service] error: Store refresh token failed', { error: error.message });
      throw new Error('Failed to store refresh token');
    }
  }

  // Verify and decode token
  verifyToken(token, type = 'access') {
    try {
      const secret = type === 'access' ? env.JWT_ACCESS_SECRET : env.JWT_REFRESH_SECRET;
      return jwt.verify(token, secret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      }
      throw new Error('Invalid token');
    }
  }

  // Check if refresh token is valid and not revoked
  async validateRefreshToken(token) {
    try {
      const decoded = this.verifyToken(token, 'refresh');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      const query = `
        SELECT rt.*, u.email, u.email_verified
        FROM refresh_tokens rt
        JOIN users u ON rt.user_id = u.id
        WHERE rt.token_hash = $1
          AND rt.expires_at > NOW()
          AND rt.revoked = false
      `;

      const result = await db.query(query, [tokenHash]);

      if (result.rows.length === 0) {
        throw new Error('Invalid or revoked refresh token');
      }

      return {
        valid: true,
        userId: decoded.userId,
        user: result.rows[0]
      };
    } catch (error) {
      console.error('[token-service] error: Validate refresh token failed', { error: error.message });
      throw error;
    }
  }

  // Revoke a specific refresh token
  async revokeRefreshToken(token) {
    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      const query = `
        UPDATE refresh_tokens
        SET revoked = true, revoked_at = NOW()
        WHERE token_hash = $1
        RETURNING id
      `;

      const result = await db.query(query, [tokenHash]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('[token-service] error: Revoke refresh token failed', { error: error.message });
      throw new Error('Failed to revoke refresh token');
    }
  }

  // Revoke all refresh tokens for a user
  async revokeAllUserTokens(userId) {
    try {
      const query = `
        UPDATE refresh_tokens
        SET revoked = true, revoked_at = NOW()
        WHERE user_id = $1 AND revoked = false
        RETURNING id
      `;

      const result = await db.query(query, [userId]);
      return result.rows.length;
    } catch (error) {
      console.error('[token-service] error: Revoke all user tokens failed', { error: error.message });
      throw new Error('Failed to revoke user tokens');
    }
  }

  // Clean up expired tokens (maintenance task)
  async cleanupExpiredTokens() {
    try {
      const query = `
        DELETE FROM refresh_tokens
        WHERE expires_at < NOW() - INTERVAL '30 days'
      `;

      const result = await db.query(query);
      return result.rowCount;
    } catch (error) {
      console.error('[token-service] error: Cleanup expired tokens failed', { error: error.message });
      throw new Error('Failed to cleanup expired tokens');
    }
  }
}

module.exports = new TokenService();
