const magicLinkService = require('../../services/auth/magic.link.service');
const tokenService = require('../../services/auth/token.service');
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
    
    await magicLinkService.generateMagicLink(email, req.ip, req.headers['user-agent']);
    
    // NEVER return the magic URL - only send via email
    res.json({
      success: true,
      message: 'Magic link sent to your email'
    });
  } catch (error) {
    logger.error('Send magic link failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Verify magic link - TOKEN ONLY, no email required
 */
const verifyMagicLink = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Token required' });
    }
    
    // Verify with IP/UserAgent binding
    const user = await magicLinkService.verifyMagicLink(token, req.ip, req.headers['user-agent']);
    
    // Use unified token service (stores hashed tokens)
    const tokens = await tokenService.generateTokenPair(user.userId);
    await tokenService.storeRefreshToken(
      user.userId, 
      tokens.refreshToken,
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({
      success: true,
      data: {
        user: {
          id: user.userId,
          email: user.email
        },
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken
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
  verifyMagicLink
};
