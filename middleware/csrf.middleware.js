const { doubleCsrf } = require('csrf-csrf');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const env = require('../config/env');

// Configure double CSRF protection
const doubleCsrfOptions = {
  getSecret: () => env.CSRF_SECRET || 'default-csrf-secret-change-in-production',
  cookieName: 'bubble.csrf',
  cookieOptions: {
    sameSite: 'lax',
    path: '/',
    secure: env.NODE_ENV === 'production',
    httpOnly: true,
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getTokenFromRequest: (req) => req.headers['x-csrf-token'] || req.body.csrfToken,
};

// Initialize CSRF with proper destructuring
let csrfProtection, generateToken;

try {
  const csrf = doubleCsrf(doubleCsrfOptions);
  csrfProtection = csrf.doubleCsrfProtection;
  generateToken = csrf.generateToken;
} catch (error) {
  // console.error('CSRF initialization failed:', error);
  // Fallback middleware
  csrfProtection = (req, res, next) => next();
  generateToken = () => crypto.randomBytes(32).toString('hex');
}

// Export token generation endpoint
const getCsrfToken = (req, res) => {
  try {
    const token = generateToken(req, res);
    res.json({ 
      csrfToken: token,
      message: 'CSRF token generated successfully'
    });
  } catch (error) {
    // console.error('CSRF token generation error:', error);
    // Fallback: return a simple token
    const fallbackToken = crypto.randomBytes(32).toString('hex');
    res.json({ 
      csrfToken: fallbackToken,
      message: 'CSRF token generated (fallback)'
    });
  }
};

module.exports = {
  cookieParserMiddleware: cookieParser(),
  csrfProtection,
  getCsrfToken,
};
