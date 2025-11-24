const bcrypt = require('bcryptjs');
const { query } = require('../../config/database');
const { generateTokenPair, verifyRefreshToken, revokeRefreshToken, revokeAllUserTokens } = require('../../utils/jwt.util');
const googleAuthService = require('../../services/auth/google.auth.service');
const { createLogger } = require('../../config/monitoring');

const logger = createLogger('auth-controller');

const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await query(
      `INSERT INTO users (email, password_hash, email_verified, created_at)
       VALUES ($1, $2, FALSE, NOW()) RETURNING id, email, created_at`,
      [email, passwordHash]
    );

    const user = result.rows[0];

    await query(
      `INSERT INTO login_events (user_id, login_method, success, ip_address, user_agent)
       VALUES ($1, 'email_password', TRUE, $2, $3)`,
      [user.id, req.ip, req.get('user-agent')]
    );

    const tokens = await generateTokenPair(user, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    logger.info('User registered', { userId: user.id, email });

    res.status(201).json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, emailVerified: false },
        tokens,
      },
    });
  } catch (error) {
    logger.error('Registration failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      await query(
        `INSERT INTO login_events (user_id, login_method, success, failure_reason, ip_address, user_agent)
         VALUES (NULL, 'email_password', FALSE, 'user_not_found', $1, $2)`,
        [req.ip, req.get('user-agent')]
      );
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (!user.password_hash) {
      return res.status(401).json({ success: false, error: 'Invalid login method' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      await query(
        `INSERT INTO login_events (user_id, login_method, success, failure_reason, ip_address, user_agent)
         VALUES ($1, 'email_password', FALSE, 'invalid_password', $2, $3)`,
        [user.id, req.ip, req.get('user-agent')]
      );
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    await query(
      `UPDATE users SET last_login_at = NOW(), login_count = login_count + 1 WHERE id = $1`,
      [user.id]
    );

    await query(
      `INSERT INTO login_events (user_id, login_method, success, ip_address, user_agent)
       VALUES ($1, 'email_password', TRUE, $2, $3)`,
      [user.id, req.ip, req.get('user-agent')]
    );

    const tokens = await generateTokenPair(user, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    logger.info('User logged in', { userId: user.id });

    res.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, emailVerified: user.email_verified },
        tokens,
      },
    });
  } catch (error) {
    logger.error('Login failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Login failed' });
  }
};

const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    const tokenData = await verifyRefreshToken(refreshToken);

    const result = await query('SELECT * FROM users WHERE id = $1', [tokenData.user_id]);

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    await revokeRefreshToken(refreshToken, 'token_refresh');

    const tokens = await generateTokenPair(result.rows[0], {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ success: true, data: { tokens } });
  } catch (error) {
    logger.error('Token refresh failed', { error: error.message });
    res.status(401).json({ success: false, error: 'Invalid refresh token' });
  }
};

const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await revokeRefreshToken(refreshToken, 'user_logout');
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Logout failed' });
  }
};

const googleStart = async (req, res) => {
  try {
    const authUrl = googleAuthService.getAuthUrl();
    res.json({ success: true, data: { authUrl } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

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

module.exports = {
  register,
  login,
  refresh,
  logout,
  googleStart,
  googleCallback,
};
