const nodemailer = require('nodemailer');

// ---------------------------------------------------------------------------
// Email sending — used only for password-reset links right now.
//
// If real SMTP credentials are configured (via .env), this actually sends
// the email. If not, it safely falls back to returning the link directly
// instead of failing — clearly flagged as dev/testing mode, never silently
// pretending an email went out when it didn't.
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
 * Sends a password-reset email if SMTP is configured. If not, returns
 * { sent: false, devResetLink } so the caller (in non-production setups)
 * can show the link directly — this is what lets the whole flow be tested
 * today without any email account, and it self-upgrades to real sending
 * the moment SMTP_HOST/SMTP_USER/SMTP_PASS are added to .env, no code
 * changes required.
 */
async function sendPasswordResetEmail(toEmail, resetLink) {
  if (!hasEmailConfigured()) {
    console.log(`[No SMTP configured] Password reset link for ${toEmail}: ${resetLink}`);
    return { sent: false, devResetLink: resetLink };
  }

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
}

module.exports = { hasEmailConfigured, sendPasswordResetEmail };
