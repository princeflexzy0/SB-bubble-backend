const { query } = require('../../config/database');
const { createLogger } = require('../../config/monitoring');

const logger = createLogger('account-controller');

/**
 * Request account deletion (GDPR compliant)
 * Creates a deletion request that gets processed after confirmation
 */
const requestAccountDeletion = async (req, res) => {
  try {
    const userId = req.userId; // From auth middleware
    const { reason, confirmPassword } = req.body;

    // Verify user exists and get password hash
    const userResult = await query(
      'SELECT password_hash, email FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = userResult.rows[0];

    // If user has password (not OAuth-only), verify it
    if (user.password_hash && confirmPassword) {
      const bcrypt = require('bcryptjs');
      const validPassword = await bcrypt.compare(confirmPassword, user.password_hash);
      
      if (!validPassword) {
        return res.status(401).json({ success: false, error: 'Invalid password confirmation' });
      }
    }

    // Check for existing pending deletion request
    const existingRequest = await query(
      `SELECT id FROM data_deletion_requests 
       WHERE user_id = $1 AND status = 'pending'`,
      [userId]
    );

    if (existingRequest.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Deletion request already pending' 
      });
    }

    // Create deletion request
    const deletionRequest = await query(
      `INSERT INTO data_deletion_requests 
       (user_id, reason, status, requested_at)
       VALUES ($1, $2, 'pending', NOW())
       RETURNING id, requested_at`,
      [userId, reason || 'User requested']
    );

    logger.info('Account deletion requested', { 
      userId, 
      email: user.email,
      requestId: deletionRequest.rows[0].id 
    });

    res.json({
      success: true,
      data: {
        requestId: deletionRequest.rows[0].id,
        status: 'pending',
        message: 'Deletion request created. You have 30 days to cancel before permanent deletion.',
        requestedAt: deletionRequest.rows[0].requested_at
      }
    });
  } catch (error) {
    logger.error('Account deletion request failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to request account deletion' });
  }
};

/**
 * Cancel pending account deletion
 */
const cancelAccountDeletion = async (req, res) => {
  try {
    const userId = req.userId;

    const result = await query(
      `UPDATE data_deletion_requests 
       SET status = 'cancelled'
       WHERE user_id = $1 AND status = 'pending'
       RETURNING id`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'No pending deletion request found' 
      });
    }

    logger.info('Account deletion cancelled', { userId });

    res.json({
      success: true,
      message: 'Account deletion request cancelled successfully'
    });
  } catch (error) {
    logger.error('Cancel deletion failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to cancel deletion' });
  }
};

/**
 * Immediately delete account (for users who want instant deletion)
 * WARNING: This is permanent and immediate
 */
const deleteAccountImmediately = async (req, res) => {
  try {
    const userId = req.userId;
    const { confirmPassword, confirmText } = req.body;

    // Require explicit confirmation
    if (confirmText !== 'DELETE MY ACCOUNT') {
      return res.status(400).json({ 
        success: false, 
        error: 'Must confirm with exact text: DELETE MY ACCOUNT' 
      });
    }

    // Get user details
    const userResult = await query(
      'SELECT password_hash, email FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Verify password if exists
    if (user.password_hash && confirmPassword) {
      const bcrypt = require('bcryptjs');
      const validPassword = await bcrypt.compare(confirmPassword, user.password_hash);
      
      if (!validPassword) {
        return res.status(401).json({ success: false, error: 'Invalid password' });
      }
    }

    // Begin transaction for complete deletion
    await query('BEGIN');

    try {
      // Delete all user data (cascade will handle related records)
      // 1. Revoke all refresh tokens
      await query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);

      // 2. Delete login events
      await query('DELETE FROM login_events WHERE user_id = $1', [userId]);

      // 3. Delete KYC data
      await query('DELETE FROM kyc_audit_logs WHERE user_id = $1', [userId]);
      await query('DELETE FROM kyc_documents WHERE user_id = $1', [userId]);
      await query('DELETE FROM kyc_sessions WHERE user_id = $1', [userId]);
      await query('DELETE FROM otp_codes WHERE user_id = $1', [userId]);

      // 4. Delete payment data
      await query('DELETE FROM subscriptions WHERE user_id = $1', [userId]);
      await query('DELETE FROM payment_customers WHERE user_id = $1', [userId]);

      // 5. Delete magic links
      await query('DELETE FROM magic_links WHERE user_id = $1', [userId]);

      // 6. Finally, delete the user
      await query('DELETE FROM users WHERE id = $1', [userId]);

      // 7. Log deletion request
      await query(
        `INSERT INTO data_deletion_requests 
         (user_id, request_reason, status, requested_at, completed_at)
         VALUES ($1, 'Immediate deletion', 'completed', NOW(), NOW())`,
        [userId]
      );

      await query('COMMIT');

      logger.info('Account deleted immediately', { 
        userId, 
        email: user.email 
      });

      res.json({
        success: true,
        message: 'Account and all associated data permanently deleted'
      });
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    logger.error('Immediate account deletion failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to delete account' });
  }
};

/**
 * Get account deletion status
 */
const getDeletionStatus = async (req, res) => {
  try {
    const userId = req.userId;

    const result = await query(
      `SELECT id, status, request_reason as reason, requested_at, completed_at
       FROM data_deletion_requests
       WHERE user_id = $1
       ORDER BY requested_at DESC
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: { hasPendingDeletion: false }
      });
    }

    res.json({
      success: true,
      data: {
        hasPendingDeletion: result.rows[0].status === 'pending',
        ...result.rows[0]
      }
    });
  } catch (error) {
    logger.error('Get deletion status failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to get deletion status' });
  }
};

module.exports = {
  requestAccountDeletion,
  cancelAccountDeletion,
  deleteAccountImmediately,
  getDeletionStatus,
};
