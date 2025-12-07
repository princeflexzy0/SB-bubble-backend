const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');

function initSentry(app) {
  const SENTRY_DSN = process.env.SENTRY_DSN;
  
  if (!SENTRY_DSN) {
    // console.log('⚠️  SENTRY_DSN not configured - error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || 'production',
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app }),
      new ProfilingIntegration(),
    ],
    tracesSampleRate: 0.1,
    profilesSampleRate: 0.1,
    beforeSend(event, hint) {
      // Filter out sensitive data
      if (event.request) {
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['x-api-key'];
        }
      }
      return event;
    },
  });

  // console.log('✅ Sentry error tracking enabled');
}

function getSentryMiddleware() {
  if (!process.env.SENTRY_DSN) {
    return {
      requestHandler: (req, res, next) => next(),
      errorHandler: (err, req, res, next) => next(err),
    };
  }
  
  return {
    requestHandler: Sentry.Handlers.requestHandler(),
    errorHandler: Sentry.Handlers.errorHandler(),
  };
}

module.exports = { initSentry, getSentryMiddleware };
