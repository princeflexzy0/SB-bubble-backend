const kycService = require('../../services/kyc/kyc.service');
const { createLogger } = require('../../config/monitoring');
const logger = createLogger('kyc-controller');
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

    const result = await otpService.createAndSendOTP(kycSessionId, userId, method, destination);

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

    const result = await otpService.verifyOTP(kycSessionId, userId, otp);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Verify OTP failed', { error: error.message });
    res.status(400).json({ success: false, error: error.message });
  }
};

module.exports.sendOTP = sendOTP;
module.exports.verifyOTP = verifyOTP;

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

module.exports.getUploadUrl = getUploadUrl;
module.exports.confirmUpload = confirmUpload;

module.exports.startKYC = startKYC;
module.exports.submitConsent = submitConsent;
module.exports.getOptions = getOptions;
module.exports.getStatus = getStatus;
module.exports.changeIDType = changeIDType;
