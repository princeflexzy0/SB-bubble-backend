// workers/private/long-action-runner.js - Long-Running Task Worker
const { createLogger } = require('../../config/monitoring');
const queues = require('../queue/queueManager');

const logger = createLogger('long-action-runner');

queues.longAction.process(async (job) => {
  const { action, params, timeoutMs } = job.data;
  
  logger.info('Starting long action', { action, jobId: job.id, timeout: timeoutMs });
  
  const startTime = Date.now();
  
  try {
    // Update progress periodically
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / timeoutMs) * 100, 99);
      job.progress(progress);
      logger.info('Action progress', { action, progress: `${progress.toFixed(1)}%` });
    }, 5000);
    
    const result = await executeAction(action, params, timeoutMs);
    
    clearInterval(progressInterval);
    job.progress(100);
    
    logger.info('Long action completed', { 
      action, 
      duration: `${((Date.now() - startTime) / 1000).toFixed(2)}s` 
    });
    
    return result;
  } catch (error) {
    logger.error('Long action failed', { error: error.message, action });
    throw error;
  }
});

async function executeAction(action, params, timeoutMs) {
  // Simulate long-running operation
  const actualTime = Math.min(timeoutMs, 60000); // Max 60 seconds for demo
  
  logger.info('Executing action', { action, estimatedTime: `${actualTime}ms` });
  
  await new Promise(resolve => setTimeout(resolve, actualTime));
  
  return {
    status: 'completed',
    action,
    executionTime: actualTime,
    result: `Action ${action} completed successfully`,
    timestamp: new Date().toISOString()
  };
}

logger.info('✅ Long Action Runner worker started');

module.exports = queues.longAction;
