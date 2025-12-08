const { createLogger } = require('../config/monitoring');
const { pool } = require('../config/database');
const logger = createLogger('kyc-approval-worker');

/**
 * KYC Approval Worker
 * Processes pending KYC sessions and auto-approves low-risk ones
 * Queues high-risk ones for manual review
 */

class KYCApprovalWorker {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.processingInterval = 30000; // 30 seconds
  }

  /**
   * Start the worker
   */
  start() {
    // Only run in production with proper config
    if (process.env.START_WORKERS !== 'true') {
      logger.info('Worker disabled - START_WORKERS not set to true');
      return;
    }

    if (process.env.NODE_ENV !== 'production') {
      logger.info('Worker disabled - not in production mode');
      return;
    }

    if (!process.env.REDIS_URL) {
      logger.warn('Worker running without Redis - not distributed');
    }

    if (this.isRunning) {
      logger.warn('Worker already running');
      return;
    }

    this.isRunning = true;
    logger.info('KYC approval worker started', {
      interval: this.processingInterval / 1000 + 's'
    });

    // Run immediately
    this.processQueue();

    // Then run on interval
    this.intervalId = setInterval(() => {
      this.processQueue();
    }, this.processingInterval);
  }

  /**
   * Stop the worker
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info('KYC approval worker stopped');
  }

  /**
   * Process pending KYC sessions
   */
  async processQueue() {
    try {
      logger.debug('Processing KYC approval queue');

      // Get pending sessions that need review
      const result = await pool.query(
        `SELECT id, user_id, fraud_score, fraud_flags, ocr_data, 
                document_verified_at, created_at
         FROM kyc_sessions 
         WHERE status = 'review' 
           AND document_verified_at IS NOT NULL
         ORDER BY created_at ASC
         LIMIT 10`
      );

      if (result.rows.length === 0) {
        logger.debug('No pending KYC sessions');
        return;
      }

      logger.info('Processing KYC sessions', { count: result.rows.length });

      for (const session of result.rows) {
        await this.processSession(session);
      }

    } catch (error) {
      logger.error('Queue processing failed', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Process individual KYC session
   */
  async processSession(session) {
    try {
      const { id, user_id, fraud_score, fraud_flags, ocr_data } = session;

      logger.info('Evaluating KYC session', {
        sessionId: id,
        userId: user_id,
        fraudScore: fraud_score
      });

      // Auto-approval criteria
      const shouldAutoApprove = 
        fraud_score < 0.3 && // Low fraud score
        (!fraud_flags || fraud_flags.length === 0) && // No fraud flags
        ocr_data && // Has OCR data
        ocr_data.confidence > 0.8; // High OCR confidence

      if (shouldAutoApprove) {
        await this.approveSession(id, user_id);
      } else {
        // Keep in review queue for manual approval
        logger.info('Session requires manual review', {
          sessionId: id,
          reason: this.getReviewReason(fraud_score, fraud_flags, ocr_data)
        });

        // Update last_reviewed timestamp
        await pool.query(
          `UPDATE kyc_sessions 
           SET updated_at = NOW()
           WHERE id = $1`,
          [id]
        );
      }

    } catch (error) {
      logger.error('Session processing failed', {
        sessionId: session.id,
        error: error.message
      });
    }
  }

  /**
   * Auto-approve a KYC session
   */
  async approveSession(sessionId, userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Update session status
      await client.query(
        `UPDATE kyc_sessions 
         SET status = 'approved',
             approved_at = NOW(),
             approved_by = 'auto-worker',
             updated_at = NOW()
         WHERE id = $1`,
        [sessionId]
      );

      // Update user KYC status
      await client.query(
        `UPDATE users 
         SET kyc_verified = true,
             kyc_verified_at = NOW()
         WHERE id = $1`,
        [userId]
      );

      // Log audit trail
      await client.query(
        `INSERT INTO audit_logs (user_id, action, details, created_at)
         VALUES ($1, 'kyc_auto_approved', $2, NOW())`,
        [userId, JSON.stringify({ sessionId, approvedBy: 'worker' })]
      );

      await client.query('COMMIT');

      logger.info('KYC session auto-approved', {
        sessionId,
        userId
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get reason why session needs manual review
   */
  getReviewReason(fraudScore, fraudFlags, ocrData) {
    const reasons = [];

    if (fraudScore >= 0.3) {
      reasons.push(`High fraud score: ${fraudScore}`);
    }

    if (fraudFlags && fraudFlags.length > 0) {
      reasons.push(`Fraud flags: ${fraudFlags.join(', ')}`);
    }

    if (!ocrData) {
      reasons.push('Missing OCR data');
    } else if (ocrData.confidence <= 0.8) {
      reasons.push(`Low OCR confidence: ${ocrData.confidence}`);
    }

    return reasons.join('; ');
  }
}

// Export singleton instance
const worker = new KYCApprovalWorker();

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, stopping worker');
  worker.stop();
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, stopping worker');
  worker.stop();
});

module.exports = worker;
