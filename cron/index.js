// cron/index.js - Cron Jobs Manager
const { startDailyCleanup } = require('./dailyCleanup');
const { startWeeklyAudit } = require('./weeklyAudit');
const { startRetryStuckWorkflows } = require('./retryStuckWorkflows');
const { startRefreshTokens } = require('./refreshTokens');
const { createLogger } = require('../config/monitoring');

const logger = createLogger('cron-manager');

function startAllCronJobs() {
  logger.info('🕐 Starting all cron jobs...');
  
  startDailyCleanup();
  startWeeklyAudit();
  startRetryStuckWorkflows();
  startRefreshTokens();
  
  logger.info('✅ All cron jobs started successfully');
}

module.exports = { startAllCronJobs };
