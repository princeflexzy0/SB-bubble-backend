const crypto = require('crypto');
const { query } = require('../config/database');
const { createLogger } = require('../config/monitoring');
const twilio = require('twilio');
const sgMail = require('@sendgrid/mail');

const logger = createLogger('otp-service');

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;

const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

const hashOTP = (otp) => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

const sendSMS = async (phoneNumber, otp, context = 'verification') => {
  try {
    const message = `Your verification code for Bubble is ${otp}. Valid for ${OTP_EXPIRY_MINUTES} minutes. We requested this for ${context}. If you didn't request this, contact support.`;

    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });

    logger.info('SMS OTP sent', { phoneNumber: phoneNumber.slice(-4) });
    return true;
  } catch (error) {
    logger.error('Failed to send SMS', { error: error.message });
    throw new Error('Failed to send SMS verification code');
  }
};

const sendEmail = async (email, otp, context = 'verification') => {
  try {
    const msg = {
      to: email,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL,
        name: process.env.SENDGRID_FROM_NAME || 'Bubble',
      },
      subject: `Your Verification Code: ${otp}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #4F46E5; color: white; padding: 20px; text-align: center;">
            <h1>Verification Code</h1>
          </div>
          <div style="padding: 30px; background: #f9fafb;">
            <p>Your verification code for ${context}:</p>
            <div style="font-size: 32px; font-weight: bold; color: #4F46E5; text-align: center; padding: 20px; background: white; border-radius: 8px; margin: 20px 0; letter-spacing: 5px;">
              ${otp}
            </div>
            <p><strong>This code expires in ${OTP_EXPIRY_MINUTES} minutes.</strong></p>
            <p>If you didn't request this code, please ignore this email.</p>
          </div>
        </div>
      `,
    };

    await sgMail.send(msg);
    logger.info('Email OTP sent', { email: email.replace(/(.{3}).*(@.*)/, '$1***$2') });
    return true;
  } catch (error) {
    logger.error('Failed to send email', { error: error.message });
    throw new Error('Failed to send email verification code');
  }
};

const createOTP = async (kycSessionId, userId, method, destination, context = 'order confirmation') => {
  try {
    const recentOTPs = await query(
      `SELECT COUNT(*) as count FROM otp_codes WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
      [userId]
    );

    if (parseInt(recentOTPs.rows[0].count) >= 10) {
      throw new Error('Too many OTP requests. Please try again later.');
    }

    await query(
      `UPDATE otp_codes SET expires_at = NOW() WHERE kyc_session_id = $1 AND is_verified = FALSE`,
      [kycSessionId]
    );

    const otp = generateOTP();
    const otpHash = hashOTP(otp);
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

    await query(
      `INSERT INTO otp_codes (kyc_session_id, user_id, otp_hash, otp_method, destination, expires_at, max_attempts)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [kycSessionId, userId, otpHash, method, destination, expiresAt, MAX_ATTEMPTS]
    );

    if (method === 'sms') {
      await sendSMS(destination, otp, context);
    } else if (method === 'email') {
      await sendEmail(destination, otp, context);
    } else {
      throw new Error('Invalid OTP method');
    }

    logger.info('OTP created and sent', { kycSessionId, method, userId });

    return {
      success: true,
      expiresAt,
      method,
      destination: method === 'sms' ? `***${destination.slice(-4)}` : destination.replace(/(.{3}).*(@.*)/, '$1***$2'),
    };
  } catch (error) {
    logger.error('Failed to create OTP', { error: error.message, kycSessionId });
    throw error;
  }
};

const verifyOTP = async (kycSessionId, otp) => {
  try {
    const otpHash = hashOTP(otp);

    const result = await query(
      `SELECT * FROM otp_codes 
       WHERE kyc_session_id = $1 AND is_verified = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [kycSessionId]
    );

    if (result.rows.length === 0) {
      throw new Error('OTP not found or expired');
    }

    const otpRecord = result.rows[0];

    if (otpRecord.attempts >= otpRecord.max_attempts) {
      throw new Error('Maximum OTP attempts exceeded');
    }

    await query(`UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1`, [otpRecord.id]);

    if (otpRecord.otp_hash !== otpHash) {
      logger.warn('Invalid OTP attempt', { kycSessionId });
      throw new Error('Invalid OTP code');
    }

    await query(`UPDATE otp_codes SET is_verified = TRUE, verified_at = NOW() WHERE id = $1`, [otpRecord.id]);
    await query(`UPDATE kyc_sessions SET otp_verified = TRUE, updated_at = NOW() WHERE id = $1`, [kycSessionId]);

    logger.info('OTP verified successfully', { kycSessionId });

    return { success: true, verified: true };
  } catch (error) {
    logger.error('OTP verification failed', { error: error.message, kycSessionId });
    throw error;
  }
};

module.exports = {
  createOTP,
  verifyOTP,
};
