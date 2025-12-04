const { pool } = require('../../config/database');
const { getClientWithContext } = require('../../utils/rls-helper');
const bcrypt = require('bcryptjs');
const { query } = require('../../config/database');
const tokenService = require('../../services/auth/token.service');
const googleAuthService = require('../../services/auth/google.auth.service');
const { createLogger } = require('../../config/monitoring');

const logger = createLogger('auth-controller');

/**
 * Register new user
 */
const register = async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, password } = req.body;
    
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    
    const result = await client.query(
      `INSERT INTO users (email, password_hash, email_verified, created_at)
       VALUES ($1, $2, FALSE, NOW()) RETURNING id, email, email_verified, created_at`,
      [email, passwordHash]
    );

    const user = result.rows[0];
    
    // ✅ SET RLS CONTEXT
    await client.query('SELECT set_user_context($1)', [user.id]);
    
    // Log login event
    await client.query(
      `INSERT INTO login_events (user_id, login_method, success, ip_address, user_agent)
       VALUES ($1, 'email_password', TRUE, $2, $3)`,
      [user.id, req.ip, req.get('user-agent')]
    );

    // Use unified token service
    const tokens = await tokenService.generateTokenPair(user.id, req.ip, req.get('user-agent'));
    
    await tokenService.storeRefreshToken(
      user.id,
      tokens.refreshToken,
      req.ip,
      req.get('user-agent')
    );

    logger.info('User registered', { userId: user.id, email });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.email_verified
        },
        tokens
      }
    });
  } catch (error) {
    logger.error('Registration failed', { error: error.message, email: req.body.email });
    res.status(500).json({ success: false, error: 'Registration failed' });
  } finally {
    client.release();
  }
};

/**
 * Login user
 */
const login = async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, password } = req.body;

    const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      await client.query(
        `INSERT INTO login_events (user_id, login_method, success, ip_address, user_agent)
         VALUES (NULL, 'email_password', FALSE, $1, $2)`,
        [req.ip, req.get('user-agent')]
      );
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      await client.query(
        `INSERT INTO login_events (user_id, login_method, success, ip_address, user_agent)
         VALUES ($1, 'email_password', FALSE, $2, $3)`,
        [user.id, req.ip, req.get('user-agent')]
      );
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // ✅ SET RLS CONTEXT
    await client.query('SELECT set_user_context($1)', [user.id]);

    // Log successful login
    await client.query(
      `INSERT INTO login_events (user_id, login_method, success, ip_address, user_agent)
       VALUES ($1, 'email_password', TRUE, $2, $3)`,
      [user.id, req.ip, req.get('user-agent')]
    );

    const tokens = await tokenService.generateTokenPair(user.id, req.ip, req.get('user-agent'));
    
    await tokenService.storeRefreshToken(
      user.id,
      tokens.refreshToken,
      req.ip,
      req.get('user-agent')
    );

    logger.info('User logged in', { userId: user.id, email });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.email_verified
        },
        tokens
      }
    });
  } catch (error) {
    logger.error('Login failed', { error: error.message, email: req.body.email });
    res.status(500).json({ success: false, error: 'Login failed' });
  } finally {
    client.release();
  }
};

/**
 * Refresh token
 */
const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ success: false, error: 'Refresh token required' });
    }

    // Verify and get user from token service
    const tokenData = await tokenService.verifyRefreshToken(refreshToken);

    const result = await query('SELECT * FROM users WHERE id = $1', [tokenData.userId]);

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    const user = result.rows[0];

    // Revoke old token (token rotation)
    await tokenService.revokeRefreshToken(refreshToken, 'token_refresh');

    // Generate new token pair
    const tokens = await tokenService.generateTokenPair(user.id, req.ip, req.get('user-agent'));

    res.json({ success: true, data: { tokens } });
  } catch (error) {
    logger.error('Token refresh failed', { error: error.message });
    res.status(401).json({ success: false, error: 'Invalid refresh token' });
  }
};

/**
 * Logout
 */
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await tokenService.revokeRefreshToken(refreshToken, 'user_logout');
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Logout failed' });
  }
};

/**
 * Google OAuth start
 */
const googleStart = async (req, res) => {
  try {
    const authUrl = googleAuthService.getAuthUrl();
    res.json({ success: true, data: { authUrl } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Google OAuth callback
 */
const googleCallback = async (req, res) => {
  try {
    const { code } = req.body;

    const result = await googleAuthService.handleGoogleCallback(code, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Google callback failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Google authentication failed' });
  }
};

/**
 * Apple OAuth start
 */
const appleStart = async (req, res) => {
  try {
    const appleAuthUrl = `https://appleid.apple.com/auth/authorize?client_id=${process.env.APPLE_CLIENT_ID}&redirect_uri=${process.env.APPLE_REDIRECT_URI}&response_type=code id_token&response_mode=form_post&scope=email name`;
    res.json({
      success: true,
      data: { authUrl: appleAuthUrl }
    });
  } catch (error) {
    logger.error('Apple start failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to start Apple sign-in' });
  }
};

/**
 * Apple OAuth callback - FIXED: Uses token.service, hashes refresh token
 */
const appleCallback = async (req, res) => {
  try {
    const { id_token, user } = req.body;

    if (!id_token) {
      return res.status(400).json({ success: false, error: 'Missing ID token' });
    }

    const appleService = require('../../services/auth/apple.auth.service');
    const userRecord = await appleService.handleAppleCallback(id_token, user ? JSON.parse(user) : null);

    // Use unified token service (generates and stores HASHED refresh token)
    const tokens = await tokenService.generateTokenPair({ 
      id: userRecord.id, 
      email: userRecord.email, 
      role: userRecord.role || 'user' 
    });
    await tokenService.storeRefreshToken(userRecord.id, tokens.refreshToken, req.ip, req.get('user-agent'));

    res.json({
      success: true,
      data: {
        user: {
          id: userRecord.id,
          email: userRecord.email
        },
        tokens
      }
    });
  } catch (error) {
    logger.error('Apple callback failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Apple sign-in failed' });
  }
};

/**
 * Get current user
 */
const getMe = async (req, res) => {
  try {
    const userId = req.userId;
    const result = await query(
      'SELECT id, email, full_name, email_verified, created_at, last_login_at, profile_picture_url FROM users WHERE id = $1',
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const user = result.rows[0];
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        emailVerified: user.email_verified,
        profilePicture: user.profile_picture_url,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at
      }
    });
  } catch (error) {
    logger.error('Failed to get user', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to get user data' });
  }
};

/**
 * Link Google account to existing user
 */
const linkGoogle = async (req, res) => {
  try {
    const userId = req.userId;
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ success: false, error: 'ID token required' });
    }

    const googleService = require('../../services/auth/google.auth.service');
    const googleData = await googleService.verifyGoogleToken(idToken);

    const existing = await query(
      'SELECT id FROM users WHERE external_provider = $1 AND external_provider_id = $2',
      ['google', googleData.sub]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'This Google account is already linked to another user' 
      });
    }

    await query(
      `UPDATE users 
       SET external_provider = 'google', 
           external_provider_id = $1, 
           email_verified = TRUE 
       WHERE id = $2`,
      [googleData.sub, userId]
    );

    logger.info('Google account linked', { userId, googleId: googleData.sub });

    res.json({
      success: true,
      message: 'Google account linked successfully'
    });
  } catch (error) {
    logger.error('Link Google failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to link Google account' });
  }
};

/**
 * Link Apple account to existing user
 */
const linkApple = async (req, res) => {
  try {
    const userId = req.userId;
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ success: false, error: 'ID token required' });
    }

    const appleService = require('../../services/auth/apple.auth.service');
    const appleData = await appleService.verifyAppleToken(idToken);

    const existing = await query(
      'SELECT id FROM users WHERE external_provider = $1 AND external_provider_id = $2',
      ['apple', appleData.sub]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'This Apple account is already linked to another user' 
      });
    }

    await query(
      `UPDATE users 
       SET external_provider = 'apple', 
           external_provider_id = $1, 
           email_verified = TRUE 
       WHERE id = $2`,
      [appleData.sub, userId]
    );

    logger.info('Apple account linked', { userId, appleId: appleData.sub });

    res.json({
      success: true,
      message: 'Apple account linked successfully'
    });
  } catch (error) {
    logger.error('Link Apple failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to link Apple account' });
  }
};

/**
 * Change password
 */
const changePassword = async (req, res) => {
  try {
    const userId = req.userId;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        error: 'Old password and new password required' 
      });
    }

    const userResult = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = userResult.rows[0];

    if (!user.password_hash) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot change password for OAuth-only accounts' 
      });
    }

    const validPassword = await bcrypt.compare(oldPassword, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ success: false, error: 'Incorrect old password' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ 
        success: false, 
        error: 'New password must be at least 8 characters' 
      });
    }

    const newHash = await bcrypt.hash(newPassword, 12);

    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, userId]);

    // Revoke all refresh tokens (force re-login)
    await query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);

    logger.info('Password changed', { userId });

    res.json({
      success: true,
      message: 'Password changed successfully. Please login again on all devices.'
    });
  } catch (error) {
    logger.error('Change password failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to change password' });
  }
};

/**
 * Reset password (placeholder)
 */
const resetPassword = async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented yet' });
};

/**
 * Verify email (placeholder)
 */
const verifyEmail = async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented yet' });
};

// Export all methods
module.exports = {
  register,
  signUp: register,
  login,
  signIn: login,
  refresh,
  refreshToken: refresh,
  logout,
  signOut: logout,
  googleStart,
  googleCallback,
  appleStart,
  appleCallback,
  getMe,
  linkGoogle,
  linkApple,
  changePassword,
  resetPassword,
  verifyEmail
};
// Build timestamp: 1764758682
