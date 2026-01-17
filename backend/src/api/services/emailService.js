/**
 * Simple Email service using nodemailer
 * Reads SMTP configuration from environment variables:
 * SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE (true/false), EMAIL_FROM
 */

const nodemailer = require('nodemailer');

const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpSecure = process.env.SMTP_SECURE === 'true';
const emailFrom = process.env.EMAIL_FROM || (smtpUser || 'no-reply@example.com');

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  if (!smtpHost || !smtpPort) {
    // leave transporter null — sendMail will reject if called
    return null;
  }
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: !!smtpSecure,
    auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined
  });

  return transporter;
}

class EmailService {
  /**
   * Send an email. Options: { to, subject, text, html }
   */
  static async sendMail(options = {}) {
    const t = getTransporter();
    if (!t) {
      throw new Error('SMTP not configured (set SMTP_HOST and SMTP_PORT)');
    }

    const mail = {
      from: options.from || emailFrom,
      to: options.to,
      subject: options.subject || '',
      text: options.text || undefined,
      html: options.html || undefined
    };

    return new Promise((resolve, reject) => {
      t.sendMail(mail, (err, info) => {
        if (err) return reject(err);
        resolve(info);
      });
    });
  }
}

module.exports = EmailService;
