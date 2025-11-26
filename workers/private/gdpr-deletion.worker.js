const { query } = require('../../config/database');
const { createLogger } = require('../../config/monitoring');

const logger = createLogger('gdpr-deletion');

/**
 * GDPR Deletion Worker
 * Processes scheduled account deletions after grace period
 */
class GDPRDeletionWorker {
  constructor() {
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) {
      logger.warn('GDPR worker already running');
      return;
    }

    this.isRunning = true;
    logger.info('GDPR Deletion Worker started');

    // Check every hour
    this.interval = setInterval(() => {
      this.processScheduledDeletions();
    }, 60 * 60 * 1000);

    // Run immediately on start
    this.processScheduledDeletions();
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.isRunning = false;
      logger.info('GDPR Deletion Worker stopped');
    }
  }

  async processScheduledDeletions() {
    try {
      // Get deletions ready to process
      const result = await query(
        `SELECT dq.*, u.email 
         FROM deletion_queue dq
         JOIN users u ON dq.user_id = u.id
         WHERE dq.status = 'pending' 
         AND dq.scheduled_for <= NOW()
         LIMIT 10`
      );

      if (result.rows.length === 0) {
        return;
      }

      logger.info(`Processing ${result.rows.length} scheduled deletions`);

      for (const deletion of result.rows) {
        await this.deleteUserData(deletion);
      }
    } catch (error) {
      logger.error('Process deletions failed', { error: error.message });
    }
  }

  async deleteUserData(deletion) {
    const userId = deletion.user_id;
    const email = deletion.email;

    try {
      logger.info('Starting GDPR deletion', { userId, email });

      await query('BEGIN');

      // Track what gets deleted
      const deletedData = {
        refresh_tokens: 0,
        login_events: 0,
        kyc_sessions: 0,
        kyc_documents: 0,
        kyc_audit_logs: 0,
        otp_codes: 0,
        magic_links: 0,
        subscriptions: 0,
        payment_customers: 0,
        user_account: 0
      };

      // Delete all user data
      deletedData.refresh_tokens = (await query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId])).rowCount;
      deletedData.login_events = (await query('DELETE FROM login_events WHERE user_id = $1', [userId])).rowCount;
      deletedData.kyc_audit_logs = (await query('DELETE FROM kyc_audit_logs WHERE user_id = $1', [userId])).rowCount;
      deletedData.kyc_documents = (await query('DELETE FROM kyc_documents WHERE user_id = $1', [userId])).rowCount;
      deletedData.kyc_sessions = (await query('DELETE FROM kyc_sessions WHERE user_id = $1', [userId])).rowCount;
      deletedData.otp_codes = (await query('DELETE FROM otp_codes WHERE user_id = $1', [userId])).rowCount;
      deletedData.magic_links = (await query('DELETE FROM magic_links WHERE user_id = $1', [userId])).rowCount;
      deletedData.subscriptions = (await query('DELETE FROM subscriptions WHERE user_id = $1', [userId])).rowCount;
      deletedData.payment_customers = (await query('DELETE FROM payment_customers WHERE user_id = $1', [userId])).rowCount;
      deletedData.user_account = (await query('DELETE FROM users WHERE id = $1', [userId])).rowCount;

      // Log erasure
      await query(
        `INSERT INTO gdpr_erasure_logs (user_id, email, data_deleted, reason, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [userId, email, JSON.stringify(deletedData), 'Scheduled deletion after grace period']
      );

      // Mark deletion as completed
      await query(
        `UPDATE deletion_queue 
         SET status = 'completed', completed_at = NOW() 
         WHERE id = $1`,
        [deletion.id]
      );

      await query('COMMIT');

      logger.info('GDPR deletion completed', { userId, email, deletedData });
    } catch (error) {
      await query('ROLLBACK');
      logger.error('GDPR deletion failed', { userId, error: error.message });

      // Mark as failed
      await query(
        `UPDATE deletion_queue 
         SET status = 'failed' 
         WHERE id = $1`,
        [deletion.id]
      );
    }
  }
}

const worker = new GDPRDeletionWorker();

if (process.env.NODE_ENV !== 'test') {
  worker.start();
}

module.exports = worker;
