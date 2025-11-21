// Global test setup
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.INTERNAL_API_KEY = 'test-internal-api-key';
process.env.INTERNAL_HMAC_SECRET = 'test-hmac-secret-for-testing-at-least-32-chars-long';

// Suppress console logs during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
