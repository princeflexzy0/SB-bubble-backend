const tokenService = require('./token.service');
const { query } = require('../../config/database');
const { createLogger } = require('../../config/monitoring');
const appleJwks = require('./apple-jwks.service');

const logger = createLogger('apple-auth');

/**
 * Handle Apple callback with JWKS verification
 */
const handleAppleCallback = async (idToken, userInfo) => {
  try {
    // VERIFY TOKEN WITH JWKS (not jwt.decode!)
    const appleData = await appleJwks.verifyAppleToken(idToken);
    
    const appleSub = appleData.sub;
    const email = appleData.email;
    
    // Check if user exists
    let user = await query(
      'SELECT * FROM users WHERE apple_user_identifier = $1',
      [appleSub]
    );
    
    if (user.rows.length === 0) {
      // Create new user
      const result = await query(
        `INSERT INTO users (email, apple_user_identifier, email_verified, created_at)
         VALUES ($1, $2, true, NOW())
         RETURNING *`,
        [email, appleSub]
      );
      user = result;
    }
    
    logger.info('Apple login successful', { userId: user.rows[0].id });
    
    return user.rows[0];
  } catch (error) {
    logger.error('Apple callback failed', { error: error.message });
    throw error;
  }
};

module.exports = {
  handleAppleCallback
};

/**
 * Refresh Apple token (if needed)
 */
async function refreshAppleToken(userId) {
  try {
    const result = await query(
      'SELECT apple_refresh_token FROM users WHERE id = $1',
      [userId]
    );
    
    if (!result.rows[0]?.apple_refresh_token) {
      throw new Error('No Apple refresh token found');
    }
    
    // Apple doesn't provide refresh tokens in Sign in with Apple
    // User must re-authenticate
    logger.warn('Apple token refresh requested but not supported', { userId });
    return null;
    
  } catch (error) {
    logger.error('Apple token refresh failed', { error: error.message, userId });
    throw error;
  }
}

/**
 * Revoke Apple authorization
 */
async function revokeAppleAuth(userId) {
  try {
    await query(
      `UPDATE users 
       SET apple_user_id = NULL, apple_refresh_token = NULL 
       WHERE id = $1`,
      [userId]
    );
    
    logger.info('Apple authorization revoked', { userId });
    return true;
    
  } catch (error) {
    logger.error('Apple auth revocation failed', { error: error.message, userId });
    throw error;
  }
}

module.exports.refreshAppleToken = refreshAppleToken;
module.exports.revokeAppleAuth = revokeAppleAuth;
