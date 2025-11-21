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
    // Get failed jobs
    const failedJobs = await queue.getFailed(0, 100);
    
    // Get stuck (active but not progressing) jobs
    const activeJobs = await queue.getActive(0, 100);
    const stuckJobs = activeJobs.filter(job => {
      const lastUpdate = job.timestamp || job.processedOn;
      const timeSinceUpdate = Date.now() - lastUpdate;
      return timeSinceUpdate > 30 * 60 * 1000; // 30 minutes
    });
    
    let retriedCount = 0;
    
    // Retry failed jobs (max 3 attempts)
    for (const job of failedJobs) {
      const attemptsMade = job.attemptsMade || 0;
      if (attemptsMade < 3) {
        await job.retry();
        retriedCount++;
        logger.info('Retrying failed job', { 
          queueName, 
          jobId: job.id, 
          attempt: attemptsMade + 1 
        });
      }
    }
    
    // Restart stuck jobs
    for (const job of stuckJobs) {
      await job.retry();
      retriedCount++;
      logger.info('Restarting stuck job', { queueName, jobId: job.id });
    }
    
    return {
      queueName,
      failedCount: failedJobs.length,
      stuckCount: stuckJobs.length,
      retriedCount
    };
    
  } catch (error) {
    logger.error(`Error processing queue ${queueName}`, { error: error.message });
    return { queueName, retriedCount: 0, error: error.message };
  }
}

module.exports = { startRetryStuckWorkflows };
