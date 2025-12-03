const nodemailer = require('nodemailer');
const env = require('./config/env');
const { createLogger } = require('./utils/logger');
const logger = createLogger('email-service');

class EmailService {
  constructor() {
    this.transporter = this.createTransporter();
  }

  createTransporter() {
    if (env.SENDGRID_API_KEY) {
      logger.info('Using SendGrid for emails');
      return nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        auth: {
          user: 'apikey',
          pass: env.SENDGRID_API_KEY
        }
      });
    }

    if (env.SMTP_HOST) {
      logger.info('Using custom SMTP for emails');
      return nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT || 587,
        secure: env.SMTP_SECURE === 'true',
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS
        }
      });
    }

    logger.warn('⚠️  No email provider configured - using console logging');
    return null;
  }

  async sendMagicLink(email, magicUrl) {
    try {
      const mailOptions = {
        from: env.EMAIL_FROM || 'noreply@bubble.app',
        to: email,
        subject: 'Your Magic Sign-In Link',
        html: `
          <!DOCTYPE html>
          <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Sign in to your account</h2>
            <p>Click the button below to sign in securely (expires in 15 minutes):</p>
            <a href="${magicUrl}" style="display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;">
              Sign In
            </a>
            <p style="color: #666; font-size: 14px;">Or copy this link: ${magicUrl}</p>
            <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
          </body>
          </html>
        `
      };

      if (!this.transporter) {
        logger.info('📧 [DEV] Magic link email', { email, magicUrl });
        return true;
      }

      await this.transporter.sendMail(mailOptions);
      logger.info('Magic link email sent', { email });
      return true;
    } catch (error) {
      logger.error('Failed to send magic link email', { error: error.message, email });
      throw new Error('Failed to send email');
    }
  }

  async sendPasswordReset(email, resetUrl) {
    try {
      const mailOptions = {
        from: env.EMAIL_FROM || 'noreply@bubble.app',
        to: email,
        subject: 'Reset Your Password',
        html: `
          <!DOCTYPE html>
          <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Password Reset Request</h2>
            <p>Click the button below to reset your password (expires in 15 minutes):</p>
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #dc3545; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;">
              Reset Password
            </a>
            <p style="color: #666; font-size: 14px;">Or copy this link: ${resetUrl}</p>
            <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email and your password will remain unchanged.</p>
          </body>
          </html>
        `
      };

      if (!this.transporter) {
        logger.info('📧 [DEV] Password reset email', { email, resetUrl });
        return true;
      }

      await this.transporter.sendMail(mailOptions);
      logger.info('Password reset email sent', { email });
      return true;
    } catch (error) {
      logger.error('Failed to send password reset email', { error: error.message, email });
      throw new Error('Failed to send email');
    }
  }
}

module.exports = new EmailService();
