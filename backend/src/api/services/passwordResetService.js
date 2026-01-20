const crypto = require('crypto');
const PasswordResetToken = require('../../db/models/PasswordResetToken');
const User = require('../../db/models/User');
const NotificationTemplateService = require('./notificationTemplateService');
const EmailService = require('./emailService');
const { hashPassword } = require('../../utils/password');

class PasswordResetService {
  static async createTokenForEmail(email) {
    if (!email) return true;
    const user = await User.findByEmail(email).catch(() => null);
    if (!user) return true; // do not reveal whether email exists

    const token = crypto.randomBytes(32).toString('hex');
    const minutes = Number(process.env.PASSWORD_RESET_EXPIRES_MINUTES || 60);
    const expires_at = new Date(Date.now() + minutes * 60 * 1000);

    await PasswordResetToken.create({ user_id: user.id, token, expires_at });

    // Prepare reset URL
    const frontendRoot = process.env.FRONTEND_URL || '';
    const resetUrl = frontendRoot ? `${frontendRoot.replace(/\/$/, '')}/reset-password?token=${token}` : `?token=${token}`;

    const company = {
      name: process.env.COMPANY_NAME || 'Deep Sea',
      logo_url: process.env.COMPANY_LOGO_URL || '',
      address: process.env.COMPANY_ADDRESS || ''
    };
    const support_email = process.env.SUPPORT_EMAIL || process.env.EMAIL_FROM || '';

    const context = { user, resetUrl, company, support_email, expires_minutes: minutes };
    const rendered = await NotificationTemplateService.render('password_reset', 'email', context);
    const subject = rendered.subject || `Password reset instructions`;
    try {
      await EmailService.sendMail({ to: user.email, subject, text: rendered.text, html: rendered.html });
    } catch (e) {
      console.error('Failed to send password reset email', e && e.message ? e.message : e);
    }

    return true;
  }

  static async resetPassword(token, newPassword) {
    if (!token) {
      const err = new Error('Token required'); err.statusCode = 400; throw err;
    }
    if (!newPassword || String(newPassword).length < 6) {
      const err = new Error('Password must be at least 6 characters'); err.statusCode = 400; throw err;
    }

    const rec = await PasswordResetToken.findValidByToken(token);
    if (!rec) {
      const err = new Error('Invalid or expired token'); err.statusCode = 400; throw err;
    }

    const password_hash = await hashPassword(newPassword);
    const updated = await User.setPassword(rec.user_id, password_hash);
    await PasswordResetToken.markUsed(rec.id);
    return updated;
  }
}

module.exports = PasswordResetService;
