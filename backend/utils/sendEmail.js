/**
 * sendEmail.js
 * Reusable nodemailer helper for VendorBridge
 * Supports optional PDF attachments
 */

const nodemailer = require('nodemailer');

/**
 * Send an email via Gmail SMTP
 * @param {object} options
 * @param {string}   options.to          – recipient address(es), comma-separated
 * @param {string}   options.subject     – email subject
 * @param {string}   options.html        – HTML body
 * @param {Array}    [options.attachments] – [{ filename, content: Buffer, contentType }]
 * @returns {object} nodemailer info object
 */
const sendEmail = async ({ to, subject, html, attachments = [] }) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD   // App Password from .env
    }
  });

  const mailOptions = {
    from: `"VendorBridge" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
    attachments: attachments.map(att => ({
      filename: att.filename,
      content: att.content,          // Buffer
      contentType: att.contentType || 'application/pdf'
    }))
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to} | MessageId: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`❌ Email send failed to ${to}:`, error.message);
    throw error;
  }
};

module.exports = sendEmail;
