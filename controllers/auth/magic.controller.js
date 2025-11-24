const magicLinkService = require('../../services/auth/magic.link.service');
const jwtUtil = require('../../utils/jwt.util');
const { query } = require('../../config/database');
const { createLogger } = require('../../config/monitoring');

const logger = createLogger('magic-controller');

/**
 * Send magic link
 */
const sendMagicLink = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email required' });
    }

    const { magicUrl } = await magicLinkService.generateMagicLink(email);

    // TODO: Send email with magicUrl
    // For now, return it (in production, never return the link!)
    
    res.json({
      success: true,
      message: 'Magic link sent to your email',
      // Remove this in production:
      data: { magicUrl } 
    });
  } catch (error) {
    logger.error('Send magic link failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Verify magic link
 */
const verifyMagicLink = async (req, res) => {
  try {
    const { token, email } = req.body;

    if (!token || !email) {
      return res.status(400).json({ success: false, error: 'Token and email required' });
    }

    const user = await magicLinkService.verifyMagicLink(token, email);

    // Generate JWT tokens
    const accessToken = jwtUtil.generateAccessToken({
      userId: user.userId,
      email: user.email,
      role: user.role
    });

    const refreshToken = jwtUtil.generateRefreshToken({
      userId: user.userId
    });

    // Store refresh token
    await query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [user.userId, refreshToken]
    );

    res.json({
      success: true,
      data: {
        user: {
          id: user.userId,
          email: user.email
        },
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });
  } catch (error) {
    logger.error('Verify magic link failed', { error: error.message });
    res.status(400).json({ success: false, error: error.message });
  }
};

module.exports = {
  sendMagicLink,
  verifyMagicLink,
};
