const { createClient } = require('@supabase/supabase-js');
const env = require('../config/env');

/**
 * Audit logging middleware for sensitive actions
 * Logs: account changes, payments, deletions, email/password changes
 */

const SENSITIVE_ACTIONS = {
  ACCOUNT_CREATED: 'account.created',
  ACCOUNT_DELETED: 'account.deleted',
  ACCOUNT_DEACTIVATED: 'account.deactivated',
  PASSWORD_CHANGED: 'password.changed',
  EMAIL_CHANGED: 'email.changed',
  PAYMENT_CREATED: 'payment.created',
  PAYMENT_REFUNDED: 'payment.refunded',
  PROFILE_UPDATED: 'profile.updated',
  TWO_FACTOR_ENABLED: '2fa.enabled',
  TWO_FACTOR_DISABLED: '2fa.disabled',
  API_KEY_CREATED: 'api_key.created',
  API_KEY_REVOKED: 'api_key.revoked'
};

/**
 * Log audit event to database
 */
async function logAuditEvent({
  userId,
  action,
  resource,
  resourceId,
  metadata = {},
  ipAddress,
  userAgent,
  status = 'success'
}) {
  try {
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    const auditLog = {
      user_id: userId,
      action,
      resource,
      resource_id: resourceId,
      metadata: JSON.stringify(metadata),
      ip_address: ipAddress,
      user_agent: userAgent,
      status,
      timestamp: new Date().toISOString()
    };

    const { error } = await supabase
      .from('audit_logs')
      .insert(auditLog);

    if (error) {
      // console.error('Failed to write audit log:', error);
    }
  } catch (error) {
    // Don't let audit logging break the application
    // console.error('Audit logging error:', error);
  }
}

/**
 * Middleware to automatically log sensitive actions
 */
const auditLog = (action, resource) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Intercept response
    res.json = function(body) {
      // Only log if request was successful (2xx status)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const userId = req.user?.id || 'anonymous';
        const resourceId = body?.id || req.params?.id || null;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];

        // Log asynchronously (don't wait)
        logAuditEvent({
          userId,
          action,
          resource,
          resourceId,
          metadata: {
            method: req.method,
            path: req.path,
            body: sanitizeLogBody(req.body)
          },
          ipAddress,
          userAgent,
          status: 'success'
        }).catch(err => // console.error('Audit log failed:', err));
      }

      // Send original response
      return originalJson(body);
    };

    next();
  };
};

/**
 * Sanitize request body for logging (remove sensitive data)
 */
function sanitizeLogBody(body) {
  if (!body || typeof body !== 'object') return {};

  const sanitized = { ...body };
  
  // Remove sensitive fields
  const sensitiveFields = [
    'password',
    'confirmPassword',
    'currentPassword',
    'newPassword',
    'token',
    'refreshToken',
    'apiKey',
    'secretKey',
    'creditCard',
    'cvv',
    'ssn'
  ];

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

module.exports = {
  auditLog,
  logAuditEvent,
  SENSITIVE_ACTIONS
};
