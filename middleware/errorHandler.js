const { createLogger } = require('../config/monitoring');
const logger = createLogger('error-handler');

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error with full details
  logger.error('Error occurred', {
    message: err.message,
    statusCode: err.statusCode,
    path: req.path,
    method: req.method,
    stack: err.stack
  });

  // Prepare response
  const response = {
    success: false,
    error: err.message || 'Internal server error',
    code: err.statusCode
  };

  // ONLY include stack trace in development
  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }

  res.status(err.statusCode).json(response);
};

module.exports = { AppError, errorHandler };
