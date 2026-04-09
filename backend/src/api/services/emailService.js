/**
 * Simple Email service using nodemailer
 * Reads SMTP configuration from environment variables:
 * SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE (true/false), EMAIL_FROM
 */

const nodemailer = require('nodemailer');

let transporter = null;
let transporterSignature = null;

function getSmtpConfig() {
  return {
    host: process.env.SMTP_HOST || '',
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
    from: process.env.EMAIL_FROM || (process.env.SMTP_USER || 'no-reply@example.com')
  };
}

function getTransporter() {
  const smtpConfig = getSmtpConfig();
  const signature = JSON.stringify([smtpConfig.host, smtpConfig.port, smtpConfig.user, smtpConfig.pass, smtpConfig.secure]);

  if (!smtpConfig.host || !smtpConfig.port) {
    transporter = null;
    transporterSignature = null;
    // leave transporter null — sendMail will reject if called
    return null;
  }

  if (transporter && transporterSignature === signature) return transporter;

  transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: !!smtpConfig.secure,
    auth: smtpConfig.user && smtpConfig.pass ? { user: smtpConfig.user, pass: smtpConfig.pass } : undefined
  });
  transporterSignature = signature;

  return transporter;
}

class EmailService {
  /**
   * Send an email. Options: { to, subject, text, html }
   */
  static async sendMail(options = {}) {
    const t = getTransporter();
    const smtpConfig = getSmtpConfig();
    if (!t) {
      throw new Error('SMTP not configured (set SMTP_HOST and SMTP_PORT)');
    }

    const mail = {
      from: options.from || smtpConfig.from,
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
