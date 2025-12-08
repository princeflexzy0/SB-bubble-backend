const { cleanEnv, str, port, num, bool, url } = require('envalid');

// In test mode, make all vars optional with defaults
const isTest = process.env.NODE_ENV === 'test';


module.exports = cleanEnv(process.env, {
  // Server
  NODE_ENV: str({ choices: ['development', 'production', 'test'], default: 'development' }),
  PORT: port({ default: 8080 }),
  API_BASE_URL: url({ default: 'http://localhost:8080' }),
  FRONTEND_URL: url({ default: 'http://localhost:3000' }),

  // Database
  DATABASE_URL: str(),

  // JWT
  JWT_SECRET: str({ default: 'fallback-secret' }),
  JWT_ACCESS_SECRET: str({ default: isTest ? 'test-jwt-access' : undefined }),
  JWT_REFRESH_SECRET: str(),
  ENCRYPTION_KEY: str({ desc: 'Encryption key for PII data', default: 'default-encryption-key-change-in-production' }),
  JWT_ACCESS_EXPIRY: str({ default: '15m' }),
  JWT_REFRESH_EXPIRY: str({ default: '7d' }),

  // AI
  OPENAI_API_KEY: str({ default: '' }),

  // Security
  INTERNAL_API_KEY: str({ default: 'test-api-key' }),
  INTERNAL_HMAC_SECRET: str({ default: 'test-hmac-secret' }),
  BCRYPT_ROUNDS: num({ default: 12 }),

  // Redis (optional)
  REDIS_URL: str({ default: '' }),

  // Email
  SENDGRID_API_KEY: str({ default: '' }),
  FROM_EMAIL: str({ default: 'noreply@bubble.com' }),

  // Google OAuth
  GOOGLE_CLIENT_ID: str({ default: '' }),
  GOOGLE_CLIENT_SECRET: str({ default: '' }),

  // File Upload
  MAX_FILE_SIZE: num({ default: 10485760 }),
  ALLOWED_FILE_TYPES: str({ default: 'pdf,doc,docx,jpg,png,jpeg,gif,txt,csv,xlsx' }),

  // Rate Limiting
  RATE_LIMIT_WINDOW: num({ default: 900000 }),
  RATE_LIMIT_MAX: num({ default: 100 }),

  // Workers
  START_WORKERS: bool({ default: false }),

  // Monitoring
  SENTRY_DSN: str({ default: '' }),
  LOG_LEVEL: str({ choices: ['error', 'warn', 'info', 'debug'], default: 'info' }),
});
