const { doubleCsrf } = require('csrf-csrf');
const cookieParser = require('cookie-parser');
const env = require('../config/env');

// Configure double CSRF protection
const csrfConfig = doubleCsrf({
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
});

// Extract all functions from config
const { 
  invalidCsrfTokenError,
  generateToken,
  validateRequest,
  doubleCsrfProtection 
} = csrfConfig;

// Export middleware
const csrfProtection = doubleCsrfProtection;

// Export token generation endpoint
const getCsrfToken = (req, res) => {
  try {
    // Use the generateToken from config
    const token = generateToken(req, res);
    res.json({ 
      csrfToken: token,
      message: 'CSRF token generated successfully'
    });
  } catch (error) {
    console.error('CSRF token generation error:', error);
    // Fallback: return a simple token
    const fallbackToken = require('crypto').randomBytes(32).toString('hex');
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
