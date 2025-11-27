const { doubleCsrf } = require('csrf-csrf');
const cookieParser = require('cookie-parser');
const env = require('../config/env');

// Configure double CSRF protection
const {
  generateToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => env.CSRF_SECRET || 'default-csrf-secret-change-in-production',
  cookieName: '__Host-bubble.x-csrf-token',
  cookieOptions: {
    sameSite: 'strict',
    path: '/',
    secure: env.NODE_ENV === 'production',
    httpOnly: true,
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getTokenFromRequest: (req) => req.headers['x-csrf-token'] || req.body.csrfToken,
});

// Export middleware
const csrfProtection = doubleCsrfProtection;

// Export token generation endpoint
const getCsrfToken = (req, res) => {
  const token = generateToken(req, res);
  res.json({ 
    csrfToken: token,
    message: 'CSRF token generated successfully'
  });
};

module.exports = {
  cookieParserMiddleware: cookieParser(),
  csrfProtection,
  getCsrfToken,
};
