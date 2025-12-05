// cron/retryStuckWorkflows.js - Retry Stuck Workflows Cron Job
const cron = require('node-cron');
const { createLogger } = require('../config/monitoring');
const queues = require('../workers/queue/queueManager');
const logger = createLogger('cron-retry-stuck');

// Run every hour
const schedule = '0 * * * *';

function startRetryStuckWorkflows() {
  cron.schedule(schedule, async () => {
    logger.info('Checking for stuck workflows');
    
    try {
      const results = await Promise.all([
        retryStuckJobs(queues.aiOrchestrator, 'ai-orchestrator'),
        retryStuckJobs(queues.comparisonEngine, 'comparison-engine'),
        retryStuckJobs(queues.longAction, 'long-action'),
        retryStuckJobs(queues.externalInteraction, 'external-interaction'),
        retryStuckJobs(queues.cleanup, 'cleanup'),
      ]);
      
      const totalRetried = results.reduce((sum, r) => sum + r.retriedCount, 0);
      
      logger.info('Stuck workflow check completed', { 
        totalQueuesChecked: results.length,
        totalJobsRetried: totalRetried
      });
      
    } catch (error) {
      logger.error('Retry stuck workflows failed', { error: error.message });
    }
  });
  
  logger.info(`✅ Retry stuck workflows cron scheduled: ${schedule}`);
}

async function retryStuckJobs(queue, queueName) {
  try {
    let retriedCount = 0;
    
    // BullMQ API: getJobs with state filter
    const failedJobs = await queue.getJobs(['failed'], 0, 99);
    
    // Retry failed jobs
    for (const job of failedJobs) {
      try {
        await job.retry();
        retriedCount++;
        logger.info('Retried failed job', { queueName, jobId: job.id });
      } catch (retryError) {
        logger.error('Failed to retry job', { 
          queueName, 
          jobId: job.id, 
          error: retryError.message 
        });
      }
    }
    
    // Check for stuck active jobs (BullMQ API)
    const activeJobs = await queue.getJobs(['active'], 0, 99);
    const stuckJobs = activeJobs.filter(job => {
      const lastUpdate = job.timestamp || job.processedOn;
      const timeSinceUpdate = Date.now() - lastUpdate;
      return timeSinceUpdate > 30 * 60 * 1000; // 30 minutes
    });
    
    // Move stuck jobs to failed and retry
    for (const job of stuckJobs) {
      try {
        await job.moveToFailed({ message: 'Job stuck for >30min' }, false);
        await job.retry();
        retriedCount++;
        logger.info('Retried stuck job', { queueName, jobId: job.id });
      } catch (retryError) {
        logger.error('Failed to retry stuck job', { 
          queueName, 
          jobId: job.id, 
          error: retryError.message 
        });
      }
    }
    
    return { 
      queueName, 
      retriedCount,
      failedCount: failedJobs.length,
      stuckCount: stuckJobs.length
    };
    
  } catch (error) {
    logger.error(`Error processing queue ${queueName}`, { error: error.message });
    return { queueName, retriedCount: 0, failedCount: 0, stuckCount: 0 };
  }
}

module.exports = { startRetryStuckWorkflows };
