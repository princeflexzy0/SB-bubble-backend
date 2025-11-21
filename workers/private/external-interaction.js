// workers/private/external-interaction.js - External API Integration Worker
const { createLogger } = require('../../config/monitoring');
const queues = require('../queue/queueManager');

const logger = createLogger('external-interaction');

queues.externalInteraction.process(async (job) => {
  const { service, action, payload, retryCount = 0 } = job.data;
  
  logger.info('External interaction', { service, action, jobId: job.id, retry: retryCount });
  
  try {
    switch (service) {
      case 'payment':
        return await handlePaymentService(action, payload);
      case 'notification':
        return await handleNotificationService(action, payload);
      case 'storage':
        return await handleStorageService(action, payload);
      case 'analytics':
        return await handleAnalyticsService(action, payload);
      default:
        throw new Error(`Unknown service: ${service}`);
    }
  } catch (error) {
    logger.error('External interaction failed', { 
      error: error.message, 
      service, 
      action,
      retryCount 
    });
    
    // Retry logic
    if (retryCount < 3) {
      logger.info('Scheduling retry', { service, action, nextRetry: retryCount + 1 });
      throw error; // Bull will handle retry
    }
    
    throw new Error(`Failed after ${retryCount + 1} attempts: ${error.message}`);
  }
});

async function handlePaymentService(action, payload) {
  logger.info('Payment service interaction', { action });
  await new Promise(resolve => setTimeout(resolve, 2000));
  return { status: 'payment_processed', transactionId: `txn_${Date.now()}` };
}

async function handleNotificationService(action, payload) {
  logger.info('Notification service interaction', { action, recipients: payload.recipients?.length });
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { status: 'notifications_sent', count: payload.recipients?.length || 0 };
}

async function handleStorageService(action, payload) {
  logger.info('Storage service interaction', { action, fileSize: payload.size });
  await new Promise(resolve => setTimeout(resolve, 1500));
  return { status: 'file_stored', url: `https://storage.example.com/${Date.now()}` };
}

async function handleAnalyticsService(action, payload) {
  logger.info('Analytics service interaction', { action, eventCount: payload.events?.length });
  await new Promise(resolve => setTimeout(resolve, 500));
  return { status: 'events_tracked', processed: payload.events?.length || 0 };
}

logger.info('✅ External Interaction worker started');

module.exports = queues.externalInteraction;
