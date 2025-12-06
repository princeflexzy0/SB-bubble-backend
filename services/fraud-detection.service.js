const { query } = require('../config/database');
const { createLogger } = require('../config/monitoring');
const logger = createLogger('fraud-detection');

/**
 * Fraud Detection Service
 * 
 * Integrations available:
 * - Stripe Radar (if using Stripe)
 * - Sift Science
 * - Custom ML model
 */

/**
 * Check for suspicious activity
 */
async function checkTransaction(userId, amount, metadata = {}) {
  const checks = {
    velocityCheck: await velocityCheck(userId, amount),
    amountCheck: await amountCheck(amount),
    patternCheck: await patternCheck(userId, metadata),
    ipCheck: await ipCheck(metadata.ipAddress)
  };
  
  const riskScore = calculateRiskScore(checks);
  
  logger.info('Fraud check completed', { userId, riskScore, checks });
  
  return {
    allowed: riskScore < 70,
    riskScore,
    checks,
    requiresReview: riskScore >= 50 && riskScore < 70
  };
}

/**
 * Velocity check - too many transactions
 */
async function velocityCheck(userId, amount) {
  const result = await query(
    `SELECT COUNT(*) as count, SUM(amount) as total
     FROM transactions
     WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
    [userId]
  );
  
  const { count, total } = result.rows[0];
  
  return {
    passed: count < 10 && total < 10000,
    count,
    total,
    risk: count > 10 ? 'high' : total > 5000 ? 'medium' : 'low'
  };
}

/**
 * Amount check - unusually large
 */
async function amountCheck(amount) {
  const isLarge = amount > 10000;
  const isHuge = amount > 50000;
  
  return {
    passed: !isHuge,
    amount,
    risk: isHuge ? 'high' : isLarge ? 'medium' : 'low'
  };
}

/**
 * Pattern check - unusual behavior
 */
async function patternCheck(userId, metadata) {
  // Check if user's behavior matches their history
  const history = await query(
    `SELECT AVG(amount) as avg_amount, COUNT(*) as total_txns
     FROM transactions WHERE user_id = $1`,
    [userId]
  );
  
  return {
    passed: true, // Basic implementation
    risk: 'low'
  };
}

/**
 * IP check - suspicious location
 */
async function ipCheck(ipAddress) {
  if (!ipAddress) {
    return { passed: true, risk: 'low' };
  }
  
  // Check against known bad IPs (implement IP blacklist)
  // For now, basic check
  return {
    passed: true,
    ip: ipAddress,
    risk: 'low'
  };
}

/**
 * Calculate overall risk score
 */
function calculateRiskScore(checks) {
  let score = 0;
  
  if (checks.velocityCheck.risk === 'high') score += 40;
  else if (checks.velocityCheck.risk === 'medium') score += 20;
  
  if (checks.amountCheck.risk === 'high') score += 30;
  else if (checks.amountCheck.risk === 'medium') score += 15;
  
  if (checks.patternCheck.risk === 'high') score += 20;
  else if (checks.patternCheck.risk === 'medium') score += 10;
  
  if (checks.ipCheck.risk === 'high') score += 10;
  
  return score;
}

/**
 * Report fraudulent activity
 */
async function reportFraud(userId, transactionId, reason) {
  await query(
    `INSERT INTO fraud_reports (user_id, transaction_id, reason, reported_at)
     VALUES ($1, $2, $3, NOW())`,
    [userId, transactionId, reason]
  );
  
  logger.warn('Fraud reported', { userId, transactionId, reason });
}

module.exports = {
  checkTransaction,
  reportFraud
};
