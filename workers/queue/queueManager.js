// workers/queue/queueManager.js - Bull Queue Manager
const Bull = require('bull');
const { createLogger } = require('../../config/monitoring');

const logger = createLogger('queue-manager');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Create queues
const queues = {
  aiOrchestrator: new Bull('ai-orchestrator', REDIS_URL),
  comparisonEngine: new Bull('comparison-engine', REDIS_URL),
  longAction: new Bull('long-action', REDIS_URL),
  externalInteraction: new Bull('external-interaction', REDIS_URL),
  cleanup: new Bull('cleanup', REDIS_URL),
};

// Queue error handling
Object.entries(queues).forEach(([name, queue]) => {
  queue.on('error', (error) => {
    logger.error(`Queue ${name} error`, { error: error.message });
  });
  
  queue.on('failed', (job, error) => {
    logger.error(`Job failed in ${name}`, { jobId: job.id, error: error.message });
  });
  
  queue.on('completed', (job) => {
    logger.info(`Job completed in ${name}`, { jobId: job.id });
  });
});

logger.info('✅ Queue Manager initialized');

module.exports = queues;
