const crypto = require('crypto');
// Test setup file - set ALL required environment variables
process.env.NODE_ENV = 'test';

// Database
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';

// JWT
process.env.JWT_SECRET = 'test-jwt-secret-for-testing';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-for-testing';
process.env.JWT_ACCESS_SECRET = 'test-jwt-access-secret-for-testing';
process.env.JWT_EXPIRY = '1h';
process.env.JWT_REFRESH_EXPIRY = '7d';

// HMAC
process.env.HMAC_SECRET = 'test-hmac-secret-for-testing';
process.env.API_KEY_SECRET_test_key_001 = 'test_secret_123';

// Encryption
process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');

// SendGrid (dummy)
process.env.SENDGRID_API_KEY = 'SG.test-key';
process.env.SENDGRID_FROM_EMAIL = 'test@example.com';

// Frontend URL
process.env.FRONTEND_URL = 'http://localhost:3000';

// AWS S3 (dummy for tests)
process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
process.env.AWS_REGION = 'us-east-1';
process.env.S3_BUCKET = 'test-bucket';

// Supabase (dummy)
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_KEY = 'test-supabase-key';

// Optional
process.env.REDIS_URL = undefined;
process.env.SENTRY_DSN = undefined;

// Mock logger
jest.mock('../config/monitoring', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  })
}));

// Suppress envalid errors
global.console = {
  ...console,
  error: jest.fn()
};
