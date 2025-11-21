// ADD THIS TO YOUR server.js FILE

const { 
  initSentry, 
  createLogger, 
  requestLogger,
  sentryRequestHandler,
  sentryTracingHandler,
  sentryErrorHandler 
} = require('./config/monitoring');
const { startAllWorkers } = require('./workers');
const { startAllCronJobs } = require('./cron');

// Initialize logger
const logger = createLogger('backend-api');

// Initialize Sentry (add this BEFORE routes)
initSentry(app);

// Add Sentry middleware (add BEFORE your routes)
app.use(sentryRequestHandler());
app.use(sentryTracingHandler());

// Add request logging (add BEFORE routes)
app.use(requestLogger(logger));

// ... your existing routes here ...

// Add Sentry error handler (add AFTER routes, BEFORE other error handlers)
app.use(sentryErrorHandler());

// Start workers and cron jobs
if (process.env.NODE_ENV === 'production' || process.env.START_WORKERS === 'true') {
  startAllWorkers();
  startAllCronJobs();
  logger.info('✅ Workers and cron jobs started');
}

// Update your existing error handler to use logger
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

// Replace console.log with logger
app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
