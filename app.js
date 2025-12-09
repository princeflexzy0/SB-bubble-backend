const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');
const routes = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');
const { secureRequestLogger } = require('./middleware/secureLogger');
const { validateHmacSignature } = require('./middleware/validateHmacSignature');
const { cookieParserMiddleware } = require('./middleware/csrf.middleware');
const regionDetector = require('./middleware/region/regionDetector');
const env = require('./config/env');

const app = express();

// Trust Railway proxy (fixes rate-limit X-Forwarded-For warnings)
app.set("trust proxy", 1);

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
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000", "http://localhost:5173"],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-api-key", "x-signature", "x-timestamp", "X-CSRF-Token", "x-idempotency-key", "X-GPS-Lat-Long"],
  exposedHeaders: ["X-Vogue-Region"]
};

app.use(cors(corsOptions));

// ===========================================
// 4. COOKIE PARSER (for CSRF tokens)
// ===========================================
app.use(cookieParserMiddleware);

// ===========================================
// 5. BODY PARSING (with size limits)
// ===========================================
app.use(express.json({ 
  limit: '1mb',
  verify: (req, res, buf) => {
    if (req.originalUrl.includes('/webhook')) {
      req.rawBody = buf.toString('utf8');
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ===========================================
// 6. HTTPS REDIRECT
// ===========================================
app.use((req, res, next) => {
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  
  if (!isSecure && env.NODE_ENV === 'production') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  
  next();
});

// ===========================================
// ===========================================
// 7. HMAC VALIDATION (GLOBAL MOUNTING)
// ===========================================
app.use('/api/v1', (req, res, next) => {
  // Complete list of public routes (no HMAC required)
    const publicRoutes = [
    // Auth - login/register
    "/auth/login",
    "/auth/signin", 
    "/auth/register",
    "/auth/signup",
    // Auth - logout
    "/auth/logout",
    "/auth/signout",
    // Auth - token management
    "/auth/refresh",
    "/auth/reset-password",
    "/auth/csrf-token",
    // Auth - OAuth
    "/auth/google/start",
    "/auth/google/callback",
    "/auth/apple/start",
    "/auth/apple/callback",
    // Auth - Magic link
    "/auth/magic",
    // Admin - RLS migration (temporary)
    "/admin/run-rls-migration"
  ];

  // Check exemptions
  const isPublicAuth = publicRoutes.some(route => req.path.startsWith(route));
  const isWebhook = req.path.includes("/webhook");
  const isHealthRoute = req.path.startsWith("/health") || req.path.startsWith("/debug");

  if (isPublicAuth || isWebhook || isHealthRoute) {
    return next();
  }

  validateHmacSignature(req, res, next);
});
// 8. REGION DETECTION (NEW - RUNS ON EVERY REQUEST)
// ===========================================
app.use(regionDetector);

// Secure request logging
app.use(secureRequestLogger);

// API routes



// API routes
app.use('/api/v1', routes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Bubble Backend API',
    version: '1.0.0',
    status: 'operational',
    environment: env.NODE_ENV,
    region: req.context ? `${req.context.countryCode}${req.context.regionCode ? '-' + req.context.regionCode : ''}` : 'unknown'
  });
});

// ===========================================
// 9. ERROR HANDLERS
// ===========================================
if (env.NODE_ENV === 'production' && env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

app.use(errorHandler);

module.exports = app;
