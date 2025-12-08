const { encryptPIIFields, decryptPIIFields, KYC_PII_FIELDS } = require('../../utils/pii-encryption');
const kycService = require('../../services/kyc/kyc.service');
const { createLogger } = require('../../config/monitoring');
const ocrService = require('../../services/ocr.service');
const { validateUpload, generateSecureKey } = require('../../utils/upload-validator');
const logger = createLogger('kyc-controller');
const { encrypt, decrypt } = require('../../utils/encryption');
const fraudDetection = require('../../services/fraud-detection.service');
const { query } = require('../../config/database');
const otpService = require('../../services/otp.service');
const s3Service = require('../../services/storage/s3.service');

const startKYC = async (req, res) => {
  try {
    const { userId } = req.body;
    const result = await kycService.startKYCSession(userId || req.userId);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const submitConsent = async (req, res) => {
  try {
    const { kycSessionId, consentVersion } = req.body;
    const consentData = {
      consentVersion: consentVersion || 'v1.0',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    };
    const result = await kycService.recordConsent(kycSessionId, req.userId, consentData);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getOptions = async (req, res) => {
  try {
    const options = kycService.getIDOptions();
    res.json({ success: true, data: options });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};


const getStatus = async (req, res) => {
  try {
    const { kycSessionId } = req.params;
    const result = await kycService.getKYCStatus(kycSessionId, req.userId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const changeIDType = async (req, res) => {
  try {
    const { kycSessionId, newIdType } = req.body;
    const result = await kycService.changeIDType(kycSessionId, req.userId, newIdType);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};


/**
 * Send OTP
 */
const sendOTP = async (req, res) => {
  try {
    const { kycSessionId, method, destination } = req.body;
    const userId = req.userId;

    if (!kycSessionId || !method || !destination) {
      return res.status(400).json({ 
        success: false, 
        error: 'kycSessionId, method, and destination are required' 
      });
    }

    if (!['sms', 'email'].includes(method)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Method must be sms or email' 
      });
    }

    const result = await otpService.createAndSendOTP(userId, method, destination, "kyc_verification", kycSessionId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Send OTP failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Verify OTP
 */
const verifyOTP = async (req, res) => {
  try {
    const { kycSessionId, otp } = req.body;
    const userId = req.userId;

    if (!kycSessionId || !otp) {
      return res.status(400).json({ 
        success: false, 
        error: 'kycSessionId and otp are required' 
      });
    }

    const result = await otpService.verifyOTP(userId, otp, kycSessionId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Verify OTP failed', { error: error.message });
    res.status(400).json({ success: false, error: error.message });
  }
};


/**
 * Get presigned upload URL
 */
const getUploadUrl = async (req, res) => {
  try {
    const { kycSessionId, fileName, fileType, idType } = req.body;
    const userId = req.userId;

    if (!kycSessionId || !fileName || !fileType) {
      return res.status(400).json({ 
        success: false, 
        error: 'kycSessionId, fileName, and fileType are required' 
      });
    }

    const { presignedUrl, fileKey, expiresIn } = await s3Service.getPresignedUploadUrl(
      fileName,
      fileType,
      kycSessionId
    );

    // Store document metadata
    await query(
      `INSERT INTO kyc_documents (kyc_session_id, user_id, doc_type, s3_key, file_name, scan_status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', NOW())`,
      [kycSessionId, userId, idType || 'unknown', fileKey, fileName]
    );

    // Update KYC session
    if (idType) {
      await query(
        `UPDATE kyc_sessions SET selected_id_type = $1, status = 'pending_upload', updated_at = NOW() WHERE id = $2`,
        [idType, kycSessionId]
      );
    }

    res.json({
      success: true,
      data: {
        presignedUrl,
        fileKey,
        expiresIn
      }
    });
  } catch (error) {
    logger.error('Get upload URL failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Confirm upload
 */
const confirmUpload = async (req, res) => {
  try {
    const { kycSessionId, fileKey } = req.body;
    const userId = req.userId;

    if (!kycSessionId || !fileKey) {
      return res.status(400).json({ 
        success: false, 
        error: 'kycSessionId and fileKey are required' 
      });
    }

    // Verify file exists
    const exists = await s3Service.fileExists(fileKey);

    if (!exists) {
      return res.status(404).json({ 
        success: false, 
        error: 'File not found in storage' 
      });
    }

    // Update document status
    await query(
      `UPDATE kyc_documents SET scan_status = 'uploaded', updated_at = NOW() 
       WHERE s3_key = $1 AND kyc_session_id = $2`,
      [fileKey, kycSessionId]
    );

    // Update KYC session
    await query(
      `UPDATE kyc_sessions SET status = 'pending_otp', updated_at = NOW() WHERE id = $1`,
      [kycSessionId]
    );

    // Log audit
    await query(
      `INSERT INTO kyc_audit_logs (kyc_session_id, user_id, action, details, timestamp)
       VALUES ($1, $2, 'document_uploaded', $3, NOW())`,
      [kycSessionId, userId, JSON.stringify({ fileKey })]
    );

    logger.info('Upload confirmed', { kycSessionId, fileKey });

    res.json({
      success: true,
      message: 'Upload confirmed',
      data: { status: 'pending_otp', next: 'verify_otp' }
    });
  } catch (error) {
    logger.error('Confirm upload failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
};




/**
 * Approve KYC (with fraud detection)
 */

const approveKYC = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Get session
    const session = await query(
      'SELECT * FROM kyc_sessions WHERE id = $1',
      [sessionId]
    );
    
    if (session.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    
    const userId = session.rows[0].user_id;
    
    // Get OCR data from documents
    const docs = await query(
      'SELECT ocr_extracted FROM kyc_documents WHERE kyc_session_id = $1',
      [sessionId]
    );
    
    if (docs.rows.length > 0 && docs.rows[0].ocr_extracted) {
      const ocrData = JSON.parse(docs.rows[0].ocr_extracted);
      
      // RUN FRAUD DETECTION
      const duplicateCheck = await fraudDetection.checkDuplicateID(
        ocrData.documentNumber,
        ocrData.documentType,
        userId
      );
      
      if (duplicateCheck.isDuplicate) {
        return res.status(400).json({
          success: false,
          error: 'Duplicate document detected',
          reason: duplicateCheck.reason
        });
      }
    }
    
    // Approve the session
    await query(
      'UPDATE kyc_sessions SET status = \'approved\', verified_at = NOW() WHERE id = $1',
      [sessionId]
    );
    
    res.json({ success: true, message: 'KYC approved' });
  } catch (error) {
    logger.error('KYC approval failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
};

// Upload document (wrapper for backward compatibility)
const uploadDocument = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    
    // This is typically a two-step process:
    // 1. Get presigned URL (getUploadURL)
    // 2. Confirm upload (confirmUpload)
    
    // For direct upload, handle file buffer
    if (req.file) {
      const file = req.file;
      
      // Upload to S3 and process
      const kycWorkflow = require('../../services/kyc/kyc-workflow.service');
      await kycWorkflow.processDocument(sessionId, userId, file.buffer, file.originalname, 'passport');
      
      res.json({
        success: true,
        message: 'Document uploaded and processing'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'No file provided'
      });
    }
  } catch (error) {
    logger.error('Upload document failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Document upload failed'
    });
  }
};


// Export all controller methods
module.exports = {
  startKYC,
  uploadDocument,
  getStatus,
  approveKYC,
  getUploadURL,
  confirmUpload,
  verifyOTP,
  rejectKYC
};
