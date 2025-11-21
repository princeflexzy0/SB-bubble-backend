const { cleanEnv, str } = require('envalid');

module.exports = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'production', 'test'], default: 'development' }),
  PORT: str({ default: '3000' }),
  
  // Database
  DATABASE_URL: str({ default: '' }),
  SUPABASE_URL: str({ default: 'https://test.supabase.co' }),
  SUPABASE_ANON_KEY: str({ default: 'test-anon-key' }),
  SUPABASE_SERVICE_ROLE_KEY: str({ default: 'test-service-key' }),
  
  // Security
  JWT_SECRET: str({ default: 'test-jwt-secret' }),
  INTERNAL_API_KEY: str({ default: 'test-api-key' }),
  INTERNAL_HMAC_SECRET: str({ default: 'test-hmac-secret' }),
  ENCRYPTION_KEY: str({ default: 'test-encryption-key' }),
  
  // Redis
  REDIS_URL: str({ default: '' }),
  
  // External Services (optional)
  SENTRY_DSN: str({ default: '' }),
  ALLOWED_ORIGINS: str({ default: 'http://localhost:3000' }),
  
  // Payment (optional)
  STRIPE_SECRET_KEY: str({ default: '' }),
  PAYPAL_CLIENT_ID: str({ default: '' }),
  PAYPAL_CLIENT_SECRET: str({ default: '' }),
  
  // Messaging (optional)
  TWILIO_ACCOUNT_SID: str({ default: '' }),
  TWILIO_AUTH_TOKEN: str({ default: '' }),
  SENDGRID_API_KEY: str({ default: '' }),
  
  // AWS (optional)
  AWS_ACCESS_KEY_ID: str({ default: '' }),
  AWS_SECRET_ACCESS_KEY: str({ default: '' }),
  AWS_S3_BUCKET: str({ default: '' }),
  AWS_REGION: str({ default: 'us-east-1' }),  // ← ADDED THIS!
});
