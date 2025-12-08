// Test setup file
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
process.env.HMAC_SECRET = 'test-hmac-secret';
process.env.API_KEY_SECRET_test_key_001 = 'test_secret_123';

// Mock logger to avoid console spam during tests
jest.mock('../config/monitoring', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  })
}));
