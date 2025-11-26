const { query } = require('../../config/database');
const { createLogger } = require('../../config/monitoring');
const dataRetention = require('../../config/data_retention');

const logger = createLogger('purge-jobs');

/**
 * Purge Jobs Worker
 * Cleans up old data based on retention policies
 */
class PurgeJobsWorker {
  constructor() {
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) {
      logger.warn('Purge worker already running');
      return;
    }

    this.isRunning = true;
    logger.info('Purge Jobs Worker started');

    // Run daily at 2 AM
    this.scheduleDailyPurge();
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.isRunning = false;
      logger.info('Purge Jobs Worker stopped');
    }
  }

  scheduleDailyPurge() {
    // Run every 24 hours
    this.interval = setInterval(() => {
      this.runAllPurgeJobs();
    }, 24 * 60 * 60 * 1000);

    // Run immediately on start
    this.runAllPurgeJobs();
  }

  async runAllPurgeJobs() {
    logger.info('Starting daily purge jobs');

    await this.purgeOldOTPCodes();
    await this.purgeOldMagicLinks();
    await this.purgeOldLoginAttempts();
    await this.purgeExpiredRefreshTokens();
    await this.purgeOldKYCDocuments();

    logger.info('Daily purge jobs completed');
  }

  async purgeOldOTPCodes() {
    try {
      const jobId = await this.createPurgeJob('otp_codes');

      const result = await query(
        `DELETE FROM otp_codes 
         WHERE created_at < NOW() - INTERVAL '${dataRetention.KYC_DATA.OTP_CODES} days'`
      );

      await this.completePurgeJob(jobId, result.rowCount);
      logger.info('Purged old OTP codes', { count: result.rowCount });
    } catch (error) {
      logger.error('Purge OTP codes failed', { error: error.message });
    }
  }

  async purgeOldMagicLinks() {
    try {
      const jobId = await this.createPurgeJob('magic_links');

      const result = await query(
        `DELETE FROM magic_links 
         WHERE created_at < NOW() - INTERVAL '${dataRetention.SESSION_DATA.MAGIC_LINKS} days'`
      );

      await this.completePurgeJob(jobId, result.rowCount);
      logger.info('Purged old magic links', { count: result.rowCount });
    } catch (error) {
      logger.error('Purge magic links failed', { error: error.message });
    }
  }

  async purgeOldLoginAttempts() {
    try {
      const jobId = await this.createPurgeJob('login_attempts');

      const result = await query(
        `DELETE FROM login_attempts 
         WHERE created_at < NOW() - INTERVAL '30 days'`
      );

      await this.completePurgeJob(jobId, result.rowCount);
      logger.info('Purged old login attempts', { count: result.rowCount });
    } catch (error) {
      logger.error('Purge login attempts failed', { error: error.message });
    }
  }

  async purgeExpiredRefreshTokens() {
    try {
      const jobId = await this.createPurgeJob('refresh_tokens');

      const result = await query(
        `DELETE FROM refresh_tokens 
         WHERE expires_at < NOW() - INTERVAL '${dataRetention.SESSION_DATA.REFRESH_TOKENS} days'`
      );

      await this.completePurgeJob(jobId, result.rowCount);
      logger.info('Purged expired refresh tokens', { count: result.rowCount });
    } catch (error) {
      logger.error('Purge refresh tokens failed', { error: error.message });
    }
  }

  async purgeOldKYCDocuments() {
    try {
      const jobId = await this.createPurgeJob('kyc_documents');

      const result = await query(
        `DELETE FROM kyc_documents 
         WHERE created_at < NOW() - INTERVAL '${dataRetention.KYC_DATA.DOCUMENTS} days'
         AND scan_status = 'clean'`
      );

      await this.completePurgeJob(jobId, result.rowCount);
      logger.info('Purged old KYC documents', { count: result.rowCount });
    } catch (error) {
      logger.error('Purge KYC documents failed', { error: error.message });
    }
  }

  async createPurgeJob(jobType) {
    const result = await query(
      `INSERT INTO purge_jobs (job_type, status, started_at, created_at)
       VALUES ($1, 'running', NOW(), NOW())
       RETURNING id`,
      [jobType]
    );
    return result.rows[0].id;
  }

  async completePurgeJob(jobId, recordsProcessed) {
    await query(
      `UPDATE purge_jobs 
       SET status = 'completed', 
           records_processed = $1, 
           completed_at = NOW() 
       WHERE id = $2`,
      [recordsProcessed, jobId]
    );
  }
}

const worker = new PurgeJobsWorker();

if (process.env.NODE_ENV !== 'test') {
  worker.start();
}

module.exports = worker;
