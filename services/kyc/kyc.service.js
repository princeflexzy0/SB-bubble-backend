const { query } = require('../../config/database');
const { createLogger } = require('../../config/monitoring');

const logger = createLogger('kyc-service');

const startKYCSession = async (userId, reason = 'standard_verification', workflowId = null) => {
  try {
    const result = await query(
      `INSERT INTO kyc_sessions (user_id, reason, workflow_id, status)
       VALUES ($1, $2, $3, 'pending_consent') RETURNING *`,
      [userId, reason, workflowId]
    );

    const session = result.rows[0];

    await query(
      `INSERT INTO kyc_audit_logs (kyc_session_id, user_id, action, details)
       VALUES ($1, $2, 'session_created', $3)`,
      [session.id, userId, JSON.stringify({ reason })]
    );

    logger.info('KYC session created', { sessionId: session.id, userId });

    return {
      kycSessionId: session.id,
      status: session.status,
      next: 'consent',
    };
  } catch (error) {
    logger.error('Failed to create KYC session', { error: error.message, userId });
    throw error;
  }
};

const recordConsent = async (kycSessionId, userId, consentData) => {
  try {
    const { consentVersion, ipAddress, userAgent } = consentData;

    await query(
      `UPDATE kyc_sessions 
       SET consent_timestamp = NOW(), consent_version = $1, consent_ip = $2, consent_user_agent = $3, status = 'pending_upload', updated_at = NOW()
       WHERE id = $4 AND user_id = $5`,
      [consentVersion, ipAddress, userAgent, kycSessionId, userId]
    );

    await query(
      `INSERT INTO kyc_audit_logs (kyc_session_id, user_id, action, details, ip_address, user_agent)
       VALUES ($1, $2, 'consent_recorded', $3, $4, $5)`,
      [kycSessionId, userId, JSON.stringify({ consentVersion }), ipAddress, userAgent]
    );

    logger.info('Consent recorded', { kycSessionId, userId });

    return {
      success: true,
      next: 'upload',
    };
  } catch (error) {
    logger.error('Failed to record consent', { error: error.message, kycSessionId });
    throw error;
  }
};

const getIDOptions = () => {
  return {
    idTypes: [
      { value: 'passport', label: 'Passport' },
      { value: 'driver_license', label: 'Driver License' },
      { value: 'national_id', label: 'National ID' },
    ],
  };
};

const changeIDType = async (kycSessionId, userId, newIdType) => {
  try {
    await query(
      `UPDATE kyc_sessions SET selected_id_type = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3`,
      [newIdType, kycSessionId, userId]
    );

    await query(
      `UPDATE kyc_documents SET archived_at = NOW() WHERE kyc_session_id = $1 AND archived_at IS NULL`,
      [kycSessionId]
    );

    await query(
      `INSERT INTO kyc_audit_logs (kyc_session_id, user_id, action, details)
       VALUES ($1, $2, 'id_type_changed', $3)`,
      [kycSessionId, userId, JSON.stringify({ newIdType })]
    );

    logger.info('ID type changed', { kycSessionId, newIdType });

    return {
      success: true,
      newIdType,
    };
  } catch (error) {
    logger.error('Failed to change ID type', { error: error.message, kycSessionId });
    throw error;
  }
};

const getKYCStatus = async (kycSessionId, userId) => {
  try {
    const result = await query(
      `SELECT ks.*, kd.id_expiry, kd.doc_type, kd.scan_status, kd.ocr_status
       FROM kyc_sessions ks
       LEFT JOIN kyc_documents kd ON ks.id = kd.kyc_session_id AND kd.archived_at IS NULL
       WHERE ks.id = $1 AND ks.user_id = $2`,
      [kycSessionId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('KYC session not found');
    }

    const session = result.rows[0];

    return {
      kycSessionId: session.id,
      status: session.status,
      otp_verified: session.otp_verified,
      selected_id_type: session.selected_id_type,
      id_expiry: session.id_expiry,
      scan_status: session.scan_status,
      ocr_status: session.ocr_status,
      rejection_reason: session.rejection_reason,
      created_at: session.created_at,
      updated_at: session.updated_at,
    };
  } catch (error) {
    logger.error('Failed to get KYC status', { error: error.message, kycSessionId });
    throw error;
  }
};

module.exports = {
  startKYCSession,
  recordConsent,
  getIDOptions,
  changeIDType,
  getKYCStatus,
};
