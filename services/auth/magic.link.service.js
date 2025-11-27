const crypto = require('crypto');
const { query } = require('../../config/database');
const { createLogger } = require('../../config/monitoring');

const logger = createLogger('magic-link');

/**
 * Generate magic link token
 */
const generateMagicLink = async (email) => {
  try {
    // Check if user exists
    const userResult = await query('SELECT id, email FROM users WHERE email = $1', [email]);
    
    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = userResult.rows[0];

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Store token (10 min expiry)
    await query(
      `INSERT INTO magic_links (user_id, email, token_hash, expires_at, created_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes', NOW())`,
      [user.id, email, tokenHash]
    );

    // Create magic link URL
    const magicUrl = `${process.env.FRONTEND_URL}/auth/magic-verify?token=${token}&email=${encodeURIComponent(email)}`;

    logger.info('Magic link generated', { userId: user.id });

    return { magicUrl, email: user.email };
  } catch (error) {
    logger.error('Magic link generation failed', { error: error.message });
    throw error;
  }
};

/**
 * Verify magic link token
 */
const verifyMagicLink = async (token, email) => {
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find valid token
    const result = await query(
      `SELECT ml.*, u.id as user_id, u.email, u.role
       FROM magic_links ml
       JOIN users u ON ml.user_id = u.id
       WHERE ml.token_hash = $1 AND u.email = $2 AND ml.expires_at > NOW() AND ml.used_at IS NULL`,
      [tokenHash, email]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid or expired magic link');
    }

    const link = result.rows[0];

    // Mark as used
    await query(
      `UPDATE magic_links SET used_at = NOW() WHERE id = $1`,
      [link.id]
    );

    // Update last login
    await query(
      `UPDATE users SET last_login_at = NOW(), login_count = login_count + 1 WHERE id = $1`,
      [link.user_id]
    );

    // Log login event
    await query(
      `INSERT INTO login_events (user_id, provider, success)
       VALUES ($1, 'magic_link', TRUE)`,
      [link.user_id]
    );

    logger.info('Magic link verified', { userId: link.user_id });

    return {
      userId: link.user_id,
      email: link.email,
      role: link.role || 'user'
    };
  } catch (error) {
    logger.error('Magic link verification failed', { error: error.message });
    throw error;
  }
};

module.exports = {
  generateMagicLink,
  verifyMagicLink,
};
