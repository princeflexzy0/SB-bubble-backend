const app = require('./app');
const { initSentry, createLogger, requestLogger, sentryErrorHandler } = require('./config/monitoring');
const { startAllWorkers } = require('./workers');
const { startAllCronJobs } = require('./cron');

const PORT = process.env.PORT || 3000;
const logger = createLogger('backend-api');

// Initialize Sentry (if DSN is configured)
initSentry(app);

// Add request logging
app.use(requestLogger(logger));

// Add Sentry error handler
app.use(sentryErrorHandler());

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`🌍 Region Context Layer: Active`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);

// Start workers and cron jobs in production
if (process.env.NODE_ENV === 'production' || process.env.START_WORKERS === 'true') {
  try {
    startAllWorkers();
    startAllCronJobs();
    logger.info('✅ Workers and cron jobs started');
  } catch (error) {
    logger.warn('⚠️ Workers/Cron require Redis - skipping', { error: error.message });
  }
}

});

// Start workers and cron jobs in production

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, closing server...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, closing server...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

module.exports = server;

// Force deploy - 1764760144
