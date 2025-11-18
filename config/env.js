const { cleanEnv, str, port, url } = require('envalid');

// In production deployment (Railway/Render), allow placeholders
const isDeployment = process.env.RAILWAY_ENVIRONMENT || process.env.RENDER;

const env = cleanEnv(process.env, {
  // Server
  NODE_ENV: str({ choices: ['development', 'production', 'test'], default: 'development' }),
  PORT: port({ default: 3000 }),
  API_VERSION: str({ default: 'v1' }),

  // Required Security Keys (always required)
  JWT_SECRET: str({ default: isDeployment ? 'temp-jwt-secret-replace-me' : undefined }),
  ENCRYPTION_KEY: str({ default: isDeployment ? 'temp-encryption-key-replace-me' : undefined }),
  INTERNAL_API_KEY: str({ default: isDeployment ? 'temp-internal-key-replace-me' : undefined }),

  // Supabase (optional with defaults for deployment)
  SUPABASE_URL: url({ default: isDeployment ? 'https://placeholder.supabase.co' : undefined }),
  SUPABASE_ANON_KEY: str({ default: isDeployment ? 'placeholder-anon-key' : undefined }),
  SUPABASE_SERVICE_ROLE_KEY: str({ default: isDeployment ? 'placeholder-service-key' : undefined }),

  // AWS S3 (optional)
  AWS_REGION: str({ default: 'us-east-1' }),
  AWS_ACCESS_KEY_ID: str({ default: isDeployment ? 'placeholder-aws-key' : undefined }),
  AWS_SECRET_ACCESS_KEY: str({ default: isDeployment ? 'placeholder-aws-secret' : undefined }),
  S3_BUCKET_NAME: str({ default: isDeployment ? 'placeholder-bucket' : undefined }),

  // Stripe (optional)
  STRIPE_SECRET_KEY: str({ default: isDeployment ? 'sk_test_placeholder' : undefined }),
  STRIPE_PUBLISHABLE_KEY: str({ default: isDeployment ? 'pk_test_placeholder' : undefined }),
  STRIPE_WEBHOOK_SECRET: str({ default: isDeployment ? 'whsec_placeholder' : undefined }),

  // PayPal (optional)
  PAYPAL_MODE: str({ choices: ['sandbox', 'live'], default: 'sandbox' }),
  PAYPAL_CLIENT_ID: str({ default: isDeployment ? 'placeholder-paypal-id' : undefined }),
  PAYPAL_CLIENT_SECRET: str({ default: isDeployment ? 'placeholder-paypal-secret' : undefined }),

  // SendGrid (optional)
  SENDGRID_API_KEY: str({ default: isDeployment ? 'SG.placeholder' : undefined }),
  SENDGRID_FROM_EMAIL: str({ default: isDeployment ? 'noreply@example.com' : undefined }),
  SENDGRID_FROM_NAME: str({ default: 'Bubble Backend API' }),

  // Twilio (optional)
  TWILIO_ACCOUNT_SID: str({ default: '' }),
  TWILIO_AUTH_TOKEN: str({ default: '' }),
  TWILIO_PHONE_NUMBER: str({ default: '' }),

  // OpenAI (optional)
  OPENAI_API_KEY: str({ default: isDeployment ? 'sk-placeholder' : undefined }),
  OPENAI_MODEL: str({ default: 'gpt-4-turbo-preview' }),

  // Redis (optional)
  REDIS_HOST: str({ default: 'localhost' }),
  REDIS_PORT: port({ default: 6379 }),
  REDIS_PASSWORD: str({ default: '' }),

  // CORS
  ALLOWED_ORIGINS: str({ default: '*' }),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: str({ default: '900000' }),
  RATE_LIMIT_MAX_REQUESTS: str({ default: '100' }),

  // Monitoring (optional)
  SENTRY_DSN: str({ default: '' }),
  LOGTAIL_SOURCE_TOKEN: str({ default: '' }),

  // Workers
  ENABLE_WORKERS: str({ choices: ['true', 'false'], default: 'false' }),
  WORKER_CONCURRENCY: str({ default: '5' }),

  // File Upload
  MAX_FILE_SIZE_MB: str({ default: '10' }),
  ALLOWED_FILE_TYPES: str({ default: 'pdf,doc,docx,jpg,png,jpeg,gif,txt,csv,xlsx' }),

  // Virus Scan (optional)
  CLAMAV_HOST: str({ default: 'localhost' }),
  CLAMAV_PORT: port({ default: 3310 }),
});

module.exports = env;
