const { query } = require('../../config/database');
const { createLogger } = require('../../config/monitoring');
const logger = createLogger('kyc-workflow');

const KYC_STATUSES = {
  PENDING: 'pending',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  REQUIRES_RESUBMIT: 'requires_resubmit'
};

/**
 * Create new KYC session
 */
async function createSession(userId, documentType) {
  const result = await query(
    `INSERT INTO kyc_sessions (user_id, document_type, status, created_at)
     VALUES ($1, $2, $3, NOW())
     RETURNING id, user_id, document_type, status, created_at`,
    [userId, documentType, KYC_STATUSES.PENDING]
  );
  
  logger.info('KYC session created', { userId, sessionId: result.rows[0].id });
  return result.rows[0];
}

/**
 * Submit documents for review
 */
async function submitForReview(sessionId, documents) {
  const result = await query(
    `UPDATE kyc_sessions 
     SET status = $1, submitted_at = NOW(), documents = $2
     WHERE id = $3
     RETURNING *`,
    [KYC_STATUSES.SUBMITTED, JSON.stringify(documents), sessionId]
  );
  
  logger.info('KYC submitted for review', { sessionId });
  return result.rows[0];
}

/**
 * Auto-approve if all checks pass
 */
async function autoApprove(sessionId, checks) {
  const allPassed = Object.values(checks).every(c => c.passed);
  
  if (allPassed) {
    await query(
      `UPDATE kyc_sessions 
       SET status = $1, approved_at = NOW(), auto_approved = true
       WHERE id = $2`,
      [KYC_STATUSES.APPROVED, sessionId]
    );
    
    logger.info('KYC auto-approved', { sessionId });
    return true;
  }
  
  return false;
}

/**
 * Manual review
 */
async function setUnderReview(sessionId, reviewerId) {
  await query(
    `UPDATE kyc_sessions 
     SET status = $1, reviewer_id = $2, review_started_at = NOW()
     WHERE id = $3`,
    [KYC_STATUSES.UNDER_REVIEW, reviewerId, sessionId]
  );
  
  logger.info('KYC under manual review', { sessionId, reviewerId });
}

/**
 * Approve KYC
 */
async function approve(sessionId, reviewerId, notes) {
  const result = await query(
    `UPDATE kyc_sessions 
     SET status = $1, approved_at = NOW(), reviewer_id = $2, reviewer_notes = $3
     WHERE id = $4
     RETURNING *`,
    [KYC_STATUSES.APPROVED, reviewerId, notes, sessionId]
  );
  
  // Update user status
  const session = result.rows[0];
  await query(
    `UPDATE users SET kyc_verified = true, kyc_verified_at = NOW() WHERE id = $1`,
    [session.user_id]
  );
  
  logger.info('KYC approved', { sessionId, reviewerId });
  return session;
}

/**
 * Reject KYC
 */
async function reject(sessionId, reviewerId, reason) {
  await query(
    `UPDATE kyc_sessions 
     SET status = $1, rejected_at = NOW(), reviewer_id = $2, rejection_reason = $3
     WHERE id = $4`,
    [KYC_STATUSES.REJECTED, reviewerId, reason, sessionId]
  );
  
  logger.info('KYC rejected', { sessionId, reviewerId, reason });
}

module.exports = {
  KYC_STATUSES,
  createSession,
  submitForReview,
  autoApprove,
  setUnderReview,
  approve,
  reject
};
