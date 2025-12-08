const { createLogger } = require('../config/monitoring');
const logger = createLogger('workers');

/**
 * Workers Entry Point
 * Only starts workers if START_WORKERS=true
 */

if (process.env.START_WORKERS === 'true') {
  logger.info('Starting background workers');

  // Start KYC approval worker
  const kycApprovalWorker = require('./kyc-approval.worker');
  kycApprovalWorker.start();

  logger.info('All workers started');
} else {
  logger.info('Workers not started - set START_WORKERS=true to enable');
}

module.exports = {};
