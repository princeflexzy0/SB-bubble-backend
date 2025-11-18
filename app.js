const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');
const routes = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');
const { secureRequestLogger } = require('./middleware/secureLogger');
const env = require('./config/env');

const app = express();

// ===========================================
// 1. SENTRY INITIALIZATION (Production only)
// ===========================================
if (env.NODE_ENV === 'production' && env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app }),
      new ProfilingIntegration(),
    ],
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
  });

  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

// ===========================================
// 2. HARDENED HELMET CONFIGURATION
// ===========================================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true
}));

// ===========================================
// 3. HARDENED CORS CONFIGURATION
// ===========================================
// CORS Configuration (environment-based)
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000", "http://localhost:5173"],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-api-key", "x-signature", "x-timestamp"]
};

app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Secure request logging
app.use(secureRequestLogger);

// API routes
app.use('/api/v1', routes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Bubble Backend API',
    version: '1.0.0',
    status: 'operational',
    environment: env.NODE_ENV
  });
});

// ===========================================
// 4. ERROR HANDLERS
// ===========================================
if (env.NODE_ENV === 'production' && env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

app.use(errorHandler);

module.exports = app;
