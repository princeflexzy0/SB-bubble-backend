const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { generateTokenPair } = require('../utils/jwt.util');
const { createLogger } = require('../config/monitoring');

const logger = createLogger('auth-controller');

const signUp = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password required' });
    }

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

const signIn = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (!user.password_hash) {
      return res.status(401).json({ success: false, error: 'Invalid login method' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
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

const signOut = async (req, res) => {
  try {
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Logout failed' });
  }
};

const resetPassword = async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented yet' });
};

const verifyEmail = async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented yet' });
};

module.exports = {
};
  signUp,
  signIn,
  signOut,
  resetPassword,
  verifyEmail,
};

const refreshToken = async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented yet' });
};

const getMe = async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented yet' });
};


const refreshToken = async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented yet' });
};

const getMe = async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented yet' });
};

module.exports = {
  signUp,
  signIn,
  signOut,
  refreshToken,
  resetPassword,
  verifyEmail,
  getMe,
};
