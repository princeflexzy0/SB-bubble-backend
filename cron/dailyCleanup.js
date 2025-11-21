// cron/dailyCleanup.js - Daily Cleanup Cron Job
const cron = require('node-cron');
const { createLogger } = require('../config/monitoring');
const queues = require('../workers/queue/queueManager');

const logger = createLogger('cron-daily-cleanup');

// Run daily at 2 AM
const schedule = '0 2 * * *';

function startDailyCleanup() {
  cron.schedule(schedule, async () => {
    logger.info('Starting daily cleanup job');
    
    try {
      // Queue cleanup tasks
      await queues.cleanup.add('daily-logs', {
        type: 'logs',
        olderThan: 14 * 24 * 60 * 60 * 1000, // 14 days
        dryRun: false
      });
      
      await queues.cleanup.add('daily-temp-files', {
        type: 'temp-files',
        olderThan: 7 * 24 * 60 * 60 * 1000, // 7 days
        dryRun: false
      });
      
      await queues.cleanup.add('daily-sessions', {
        type: 'sessions',
        olderThan: 30 * 24 * 60 * 60 * 1000, // 30 days
        dryRun: false
      });
      
      logger.info('Daily cleanup jobs queued successfully');
    } catch (error) {
      logger.error('Daily cleanup job failed', { error: error.message });
    }
  });
  
  logger.info(`✅ Daily cleanup cron scheduled: ${schedule}`);
}

module.exports = { startDailyCleanup };
