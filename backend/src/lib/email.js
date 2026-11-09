const nodemailer = require('nodemailer');

// ---------------------------------------------------------------------------
// Email sending — used only for password-reset links right now.
//
// Sends email via nodemailer when SMTP credentials are configured.
// Never exposes tokens or passwords in server logs or API responses.
// ---------------------------------------------------------------------------

function hasEmailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transporter = null;
function getTransporter() {
  if (!hasEmailConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

/**
 * Sends a password-reset email if SMTP is configured.
 * Logs failures server-side without exposing reset tokens or passwords.
 * Never returns reset tokens or links to the caller.
 */
async function sendPasswordResetEmail(toEmail, resetLink) {
  if (!hasEmailConfigured()) {
    console.warn(`[EMAIL] Password reset requested for ${toEmail}, but SMTP is not configured. Email not sent.`);
    return { sent: false, reason: 'SMTP_NOT_CONFIGURED' };
  }

  try {
    const mailer = getTransporter();
    await mailer.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: toEmail,
      subject: 'Reset your QuestionStudio password',
      text: `We received a request to reset your QuestionStudio password.\n\n` +
            `Click this link to set a new password (valid for 1 hour):\n${resetLink}\n\n` +
            `If you didn't request this, you can safely ignore this email.`,
      html: `
        <p>We received a request to reset your QuestionStudio password.</p>
        <p><a href="${resetLink}" style="background:#101d33;color:#d9ae4e;padding:10px 18px;text-decoration:none;border-radius:6px;display:inline-block;">Reset my password</a></p>
        <p>This link is valid for 1 hour. If you didn't request this, you can safely ignore this email.</p>
      `,
    });

    return { sent: true };
  } catch (err) {
    console.error(`[EMAIL] Failed to send password reset email to ${toEmail}. Error: ${err.message}`);
    return { sent: false, reason: 'SMTP_SEND_FAILED' };
  }
}

function _resetTransporter() {
  transporter = null;
}

module.exports = { hasEmailConfigured, sendPasswordResetEmail, _resetTransporter };
