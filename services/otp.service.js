const crypto = require('crypto');
const { query } = require('../config/database');
const { createLogger } = require('../config/monitoring');

const logger = createLogger('otp-service');

// Twilio setup
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = require('twilio')(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
}

// SendGrid setup
let sgMail = null;
if (process.env.SENDGRID_API_KEY) {
  sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

/**
 * Generate 6-digit OTP
 */
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Hash OTP for secure storage
 */
const hashOTP = (otp) => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

/**
 * Send OTP via SMS (Twilio)
 */
const sendSMS = async (phoneNumber, otp, context = 'verification') => {
  try {
    if (!twilioClient) {
      logger.warn('Twilio not configured');
      return { success: false, message: 'SMS service not configured' };
    }

    const message = `Your Bubble verification code is ${otp}. Valid for 10 minutes. Context: ${context}. If you did not request this, contact support.`;

    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });

    logger.info('OTP SMS sent', { phoneNumber: phoneNumber.slice(-4) });
    return { success: true };
  } catch (error) {
    logger.error('SMS send failed', { error: error.message });
    throw error;
  }
};

/**
 * Send OTP via Email (SendGrid)
 */
const sendEmail = async (email, otp, context = 'verification') => {
  try {
    if (!sgMail) {
      logger.warn('SendGrid not configured');
      return { success: false, message: 'Email service not configured' };
    }

    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@bubble.com',
      subject: 'Your Bubble Verification Code',
      text: `Your verification code is ${otp}. Valid for 10 minutes. Context: ${context}.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Verification Code</h2>
          <p>Your Bubble verification code is:</p>
          <h1 style="background: #f4f4f4; padding: 20px; text-align: center; letter-spacing: 5px;">${otp}</h1>
          <p>Valid for <strong>10 minutes</strong>. Context: ${context}</p>
          <p>If you did not request this, contact support immediately.</p>
        </div>
      `
    };

    await sgMail.send(msg);
    logger.info('OTP email sent', { email });
    return { success: true };
  } catch (error) {
    logger.error('Email send failed', { error: error.message });
    throw error;
  }
};

/**
 * Create and send OTP (Universal)
 */
const createAndSendOTP = async (userId, method, destination, context = 'verification', kycSessionId = null) => {
  try {
    // Rate limiting check
    const recentAttempts = await query(
      `SELECT COUNT(*) as count FROM otp_codes 
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
      [userId]
    );

    if (parseInt(recentAttempts.rows[0].count) >= 5) {
      throw new Error('Too many OTP requests. Try again later.');
    }

    // Generate OTP
    const otp = generateOTP();
    const otpHash = hashOTP(otp);

    // Store OTP
    const result = await query(
      `INSERT INTO otp_codes (
        user_id, kyc_session_id, otp_hash, method, destination, 
        expires_at, attempts, created_at
      )
       VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '10 minutes', 0, NOW())
       RETURNING id`,
      [userId, kycSessionId, otpHash, method, destination]
    );

    const otpId = result.rows[0].id;

    // Send OTP
    if (method === 'sms') {
      await sendSMS(destination, otp, context);
    } else if (method === 'email') {
      await sendEmail(destination, otp, context);
    }

    logger.info('OTP created and sent', { userId, method, otpId });

    return { 
      success: true, 
      message: `OTP sent via ${method}`,
      otpId,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      method,
      destination: destination.replace(/(.{3}).*(.{4})/, '$1***$2')
    };
  } catch (error) {
    logger.error('OTP creation failed', { error: error.message });
    throw error;
  }
};

/**
 * Verify OTP (Universal)
 */
const verifyOTP = async (userId, otp, kycSessionId = null) => {
  try {
    const otpHash = hashOTP(otp);

    // Get latest OTP
    const query_text = kycSessionId 
      ? `SELECT * FROM otp_codes WHERE user_id = $1 AND kyc_session_id = $2 ORDER BY created_at DESC LIMIT 1`
      : `SELECT * FROM otp_codes WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`;
    
    const params = kycSessionId ? [userId, kycSessionId] : [userId];
    const result = await query(query_text, params);

    if (result.rows.length === 0) {
      throw new Error('No OTP found');
    }

    const otpRecord = result.rows[0];

    // Check expiry
    if (new Date(otpRecord.expires_at) < new Date()) {
      throw new Error('OTP expired');
    }

    // Check attempts
    if (otpRecord.attempts >= 5) {
      throw new Error('Too many failed attempts');
    }

    // Log attempt
    await query(
      `INSERT INTO otp_attempts (otp_code_id, user_id, success, ip_address, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [otpRecord.id, userId, otpRecord.otp_hash === otpHash, null]
    );

    // Increment attempts
    await query(
      `UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1`,
      [otpRecord.id]
    );

    // Verify hash
    if (otpRecord.otp_hash !== otpHash) {
      throw new Error('Invalid OTP');
    }

    // Mark as verified
    await query(
      `UPDATE otp_codes SET verified_at = NOW() WHERE id = $1`,
      [otpRecord.id]
    );

    logger.info('OTP verified', { userId, otpId: otpRecord.id });

    return { 
      success: true, 
      message: 'OTP verified successfully',
      verifiedAt: new Date().toISOString()
    };
  } catch (error) {
    logger.error('OTP verification failed', { error: error.message, userId });
    throw error;
  }
};

module.exports = {
  generateOTP,
  hashOTP,
  sendSMS,
  sendEmail,
  createAndSendOTP,
  verifyOTP,
};
