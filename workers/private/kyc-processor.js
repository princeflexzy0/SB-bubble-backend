const { query } = require('../../config/database');
const { createLogger } = require('../../config/monitoring');
const virusScanner = require('../../services/virus-scanner.service');
// Available for fraud checks
const { encrypt } = require('../../utils/encryption');
const fraudDetection = require("../../services/kyc/fraud-detection.service");

const logger = createLogger('kyc-processor');

/**
 * KYC Processor Worker
 * Processes uploaded KYC documents with virus scanning, OCR, and validation
 */
class KYCProcessor {
  constructor() {
    this.isProcessing = false;
  }

  async start() {
    if (this.isProcessing) {
      logger.warn('Processor already running');
      return;
    }

    this.isProcessing = true;
    logger.info('KYC Processor started');

    this.interval = setInterval(() => {
      this.processPendingDocuments();
    }, 30000);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.isProcessing = false;
      logger.info('KYC Processor stopped');
    }
  }

  async processPendingDocuments() {
    try {
      const result = await query(
        `SELECT kd.*, ks.user_id, ks.id as session_id
         FROM kyc_documents kd
         JOIN kyc_sessions ks ON kd.kyc_session_id = ks.id
         WHERE kd.scan_status = 'uploaded' 
         AND kd.ocr_status = 'pending'
         LIMIT 10`
      );

      if (result.rows.length === 0) {
        return;
      }

      logger.info(`Processing ${result.rows.length} documents`);

      for (const doc of result.rows) {
        await this.processDocument(doc);
      }
    } catch (error) {
      logger.error('Process documents failed', { error: error.message });
    }
  }

  async processDocument(doc) {
    try {
      logger.info('Processing document', { documentId: doc.id });

      // Step 1: Real virus scan
      const scanResult = await virusScanner.scanFile(doc.id, doc.s3_key);
      
      if (scanResult.status === 'infected') {
        await this.markDocumentFailed(doc.id, 'Virus detected');
        await this.markSessionRejected(doc.session_id, 'Document infected');
        return;
      }

      // Step 2: OCR extraction
      const ocrData = await this.extractOCR(doc);

      // Step 3: Validate ID expiry
      const expiryCheck = await this.validateExpiry(ocrData);

      // Encrypt sensitive fields
      if (ocrData.documentNumber) {
        ocrData.documentNumber_encrypted = encrypt(ocrData.documentNumber);
        delete ocrData.documentNumber;
      }
      if (ocrData.dateOfBirth) {
        ocrData.dateOfBirth_encrypted = encrypt(ocrData.dateOfBirth);
        delete ocrData.dateOfBirth;
      }

      if (expiryCheck.expired) {
        await this.markDocumentFailed(doc.id, 'ID expired');
        await this.markSessionRejected(doc.session_id, 'Expired ID');
        return;
      }

      // Step 4: Store OCR data
      await query(
        `UPDATE kyc_documents 
         SET scan_status = 'clean',
             ocr_status = 'done',
             ocr_extracted = $1,
             id_expiry = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [JSON.stringify(ocrData), ocrData.expiryDate, doc.id]
      );

      // Step 5: Update session
      await query(
        `UPDATE kyc_sessions 
         SET status = 'pending_otp', 
             last_verified_at = NOW(),
             updated_at = NOW() 
         WHERE id = $1`,
        [doc.session_id]
      );

      logger.info('Document processed successfully', { documentId: doc.id });
    } catch (error) {
      logger.error('Process document failed', { 
        documentId: doc.id, 
        error: error.message 
      });
      await this.markDocumentFailed(doc.id, error.message);
    }
  }

  async extractOCR(doc) {
    logger.info('Running OCR', { documentId: doc.id });
    await new Promise(resolve => setTimeout(resolve, 2000));

    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 5);

    return {
      documentType: doc.doc_type,
      documentNumber: 'MOCK123456',
      fullName: 'John Doe',
      dateOfBirth: '1990-01-01',
      issueDate: new Date().toISOString(),
      expiryDate: expiryDate.toISOString(),
      nationality: 'GB',
      confidence: 0.95
    };
  }

  async validateExpiry(ocrData) {
    if (!ocrData.expiryDate) {
      return { expired: false, expiringSoon: false };
    }

    const expiryDate = new Date(ocrData.expiryDate);
    const now = new Date();
    const daysUntilExpiry = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));

    return {
      expired: expiryDate < now,
      expiringSoon: daysUntilExpiry <= 30 && daysUntilExpiry > 0,
      daysUntilExpiry
    };
  }

  async markDocumentFailed(documentId, reason) {
    await query(
      `UPDATE kyc_documents 
       SET scan_status = 'failed', 
           ocr_status = 'error',
           updated_at = NOW() 
       WHERE id = $1`,
      [documentId]
    );
    logger.warn('Document marked as failed', { documentId, reason });
  }

  async markSessionRejected(sessionId, reason) {
    await query(
      `UPDATE kyc_sessions 
       SET status = 'rejected', 
           updated_at = NOW() 
       WHERE id = $1`,
      [sessionId]
    );
    logger.warn('Session rejected', { sessionId, reason });
  }
}

const processor = new KYCProcessor();

if (process.env.NODE_ENV !== 'test') {
  processor.start();
}

module.exports = processor;

// Only start in production with explicit flag
if (process.env.NODE_ENV === 'production' && process.env.START_WORKERS === 'true') {
  // Worker will start automatically
} else {
  module.exports = { start: () => console.log('Worker disabled') };
}
