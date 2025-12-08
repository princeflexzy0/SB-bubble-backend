const { pool } = require('../../config/database');
const virusScanner = require('../storage/virus-scanner.service');
const ocrService = require('../ocr.service');
const fraudDetection = require('../fraud-detection.service');
const { createLogger } = require('../../config/monitoring');
const logger = createLogger('kyc-workflow');

class KYCWorkflowService {
  async startSession(userId, documentType) {
    const result = await pool.query(
      `INSERT INTO kyc_sessions (user_id, document_type, status, started_at)
       VALUES ($1, $2, 'pending', NOW())
       RETURNING *`,
      [userId, documentType]
    );
    
    return result.rows[0];
  }

  async processDocument(sessionId, fileBuffer, filename, documentType) {
    try {
      // STEP 1: Virus scan FIRST
      logger.info('Starting virus scan', { sessionId, filename });
      const scanResult = await virusScanner.scanBuffer(fileBuffer, filename);
      
      if (!scanResult.isClean) {
        await pool.query(
          `UPDATE kyc_sessions 
           SET status = 'rejected', 
               rejection_reason = $1,
               completed_at = NOW()
           WHERE id = $2`,
          [`Virus detected: ${scanResult.viruses.join(', ')}`, sessionId]
        );
        throw new Error(`File contains virus: ${scanResult.viruses.join(', ')}`);
      }
      
      logger.info('Virus scan passed', { sessionId });
      
      // STEP 2: OCR extraction
      logger.info('Starting OCR extraction', { sessionId, documentType });
      const ocrData = await ocrService.extractText(fileBuffer, documentType);
      
      // STEP 3: Save OCR results to database
      logger.info('Saving OCR results', { sessionId, ocrData });
      await pool.query(
        `UPDATE kyc_sessions 
         SET ocr_data = $1,
             id_number = $2,
             id_expiry = $3,
             full_name = $4,
             date_of_birth = $5,
             document_verified_at = NOW(),
             updated_at = NOW()
         WHERE id = $6`,
        [
          JSON.stringify(ocrData),
          ocrData.documentNumber || null,
          ocrData.expiryDate || null,
          ocrData.fullName || null,
          ocrData.dateOfBirth || null,
          sessionId
        ]
      );
      
      // STEP 4: Check expiry
      if (ocrData.expiryDate) {
        const expiry = new Date(ocrData.expiryDate);
        if (expiry < new Date()) {
          await pool.query(
            `UPDATE kyc_sessions 
             SET status = 'rejected',
                 rejection_reason = 'Document expired',
                 completed_at = NOW()
             WHERE id = $1`,
            [sessionId]
          );
          throw new Error('Document has expired');
        }
      }
      
      // STEP 5: Fraud detection
      const fraudCheck = await fraudDetection.analyzeDocument(ocrData, sessionId);
      
      if (fraudCheck.riskScore > 0.7) {
        await pool.query(
          `UPDATE kyc_sessions 
           SET status = 'review',
               fraud_score = $1,
               fraud_flags = $2
           WHERE id = $3`,
          [fraudCheck.riskScore, JSON.stringify(fraudCheck.flags), sessionId]
        );
      } else {
        await pool.query(
          `UPDATE kyc_sessions 
           SET status = 'completed',
               fraud_score = $1,
               completed_at = NOW()
           WHERE id = $2`,
          [fraudCheck.riskScore, sessionId]
        );
      }
      
      return {
        success: true,
        ocrData,
        fraudCheck,
        sessionId
      };
      
    } catch (error) {
      logger.error('KYC processing failed', { sessionId, error: error.message });
      throw error;
    }
  }

  async approveSession(sessionId, adminId) {
    await pool.query(
      `UPDATE kyc_sessions 
       SET status = 'approved',
           approved_by = $1,
           approved_at = NOW()
       WHERE id = $2`,
      [adminId, sessionId]
    );
    
    // Update user verification status
    const session = await pool.query('SELECT user_id FROM kyc_sessions WHERE id = $1', [sessionId]);
    await pool.query(
      'UPDATE users SET kyc_verified = true, kyc_verified_at = NOW() WHERE id = $1',
      [session.rows[0].user_id]
    );
  }

  async rejectSession(sessionId, adminId, reason) {
    await pool.query(
      `UPDATE kyc_sessions 
       SET status = 'rejected',
           rejection_reason = $1,
           rejected_by = $2,
           rejected_at = NOW()
       WHERE id = $3`,
      [reason, adminId, sessionId]
    );
  }
}

module.exports = new KYCWorkflowService();
