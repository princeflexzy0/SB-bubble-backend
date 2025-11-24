const kycService = require('../../services/kyc/kyc.service');
const s3Service = require('../../services/storage/s3.service');
const otpService = require('../../services/otp.service');
const { query } = require('../../config/database');
const crypto = require('crypto');

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

const getUploadUrl = async (req, res) => {
  try {
    const { kycSessionId, idType, fileName, fileMime } = req.body;

    await query(
      `UPDATE kyc_sessions SET selected_id_type = $1 WHERE id = $2 AND user_id = $3`,
      [idType, kycSessionId, req.userId]
    );

    const result = await s3Service.generatePresignedUploadUrl(
      fileName,
      fileMime,
      req.userId,
      kycSessionId
    );

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const confirmUpload = async (req, res) => {
  try {
    const { kycSessionId, fileKey, fileName, fileSize, fileMime } = req.body;

    const fileHash = crypto.randomBytes(32).toString('hex');

    await query(
      `INSERT INTO kyc_documents (kyc_session_id, user_id, doc_type, s3_key, s3_bucket, file_name, file_size_bytes, file_mime, file_hash, scan_status)
       SELECT $1, $2, selected_id_type, $3, $4, $5, $6, $7, $8, 'pending'
       FROM kyc_sessions WHERE id = $1`,
      [kycSessionId, req.userId, fileKey, process.env.AWS_S3_BUCKET, fileName, fileSize, fileMime, fileHash]
    );

    await query(
      `UPDATE kyc_sessions SET status = 'pending_otp', updated_at = NOW() WHERE id = $1`,
      [kycSessionId]
    );

    res.json({ success: true, data: { scanStatus: 'pending', next: 'otp' } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const sendOTP = async (req, res) => {
  try {
    const { kycSessionId, method, destination } = req.body;
    const result = await otpService.createOTP(kycSessionId, req.userId, method, destination);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { kycSessionId, otp } = req.body;
    const result = await otpService.verifyOTP(kycSessionId, otp);

    await query(
      `UPDATE kyc_sessions SET status = 'processing', updated_at = NOW() WHERE id = $1`,
      [kycSessionId]
    );

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
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

module.exports = {
  startKYC,
  submitConsent,
  getOptions,
  getUploadUrl,
  confirmUpload,
  sendOTP,
  verifyOTP,
  getStatus,
  changeIDType,
};
