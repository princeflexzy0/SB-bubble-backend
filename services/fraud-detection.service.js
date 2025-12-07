const { query } = require('../config/database');
const { createLogger } = require('../config/monitoring');
const logger = createLogger('fraud-detection');

/**
 * Check for suspicious activity
 */
async function checkTransaction(userId, amount, metadata = {}) {
  try {
    const checks = {
      velocityCheck: await velocityCheck(userId, amount),
      amountCheck: await amountCheck(amount),
      patternCheck: await patternCheck(userId, metadata),
      ipCheck: await ipCheck(metadata.ipAddress)
    };
    
    const riskScore = calculateRiskScore(checks);
    
    logger.info('Fraud check completed', { userId, riskScore });
    
    return {
      allowed: riskScore < 70,
      riskScore,
      checks,
      requiresReview: riskScore >= 50 && riskScore < 70
    };
  } catch (error) {
    logger.error('Fraud check failed', { error: error.message, userId });
    return { allowed: true, riskScore: 0, error: error.message };
  }
}

async function velocityCheck(userId, amount) {
  try {
    const result = await query(
      `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
       FROM transactions
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
      [userId]
    );
    
    const { count, total } = result.rows[0];
    
    return {
      passed: count < 10 && total < 10000,
      count: parseInt(count),
      total: parseFloat(total),
      risk: count > 10 ? 'high' : total > 5000 ? 'medium' : 'low'
    };
  } catch (error) {
    logger.error('Velocity check failed', { error: error.message });
    return { passed: true, count: 0, total: 0, risk: 'low' };
  }
}

async function amountCheck(amount) {
  try {
    const isLarge = amount > 10000;
    const isHuge = amount > 50000;
    
    return {
      passed: !isHuge,
      amount,
      risk: isHuge ? 'high' : isLarge ? 'medium' : 'low'
    };
  } catch (error) {
    logger.error('Amount check failed', { error: error.message });
    return { passed: true, amount, risk: 'low' };
  }
}

async function patternCheck(userId, metadata) {
  try {
    const history = await query(
      `SELECT AVG(amount) as avg_amount, COUNT(*) as total_txns
       FROM transactions WHERE user_id = $1`,
      [userId]
    );
    
    return {
      passed: true,
      risk: 'low'
    };
  } catch (error) {
    logger.error('Pattern check failed', { error: error.message });
    return { passed: true, risk: 'low' };
  }
}

async function ipCheck(ipAddress) {
  try {
    if (!ipAddress) {
      return { passed: true, risk: 'low' };
    }
    
    return {
      passed: true,
      ip: ipAddress,
      risk: 'low'
    };
  } catch (error) {
    logger.error('IP check failed', { error: error.message });
    return { passed: true, risk: 'low' };
  }
}

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

async function reportFraud(userId, transactionId, reason) {
  try {
    await query(
      `INSERT INTO fraud_reports (user_id, transaction_id, reason, reported_at)
       VALUES ($1, $2, $3, NOW())`,
      [userId, transactionId, reason]
    );
    
    logger.warn('Fraud reported', { userId, transactionId, reason });
  } catch (error) {
    logger.error('Fraud report failed', { error: error.message });
    throw error;
  }
}

module.exports = {
  checkTransaction,
  reportFraud
};
