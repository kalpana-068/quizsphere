const nodemailer = require('nodemailer');
let transporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === '465',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}
exports.send = async (to, subject, html) => {
  if (!transporter) {
    console.log(`[email skipped: SMTP not configured] to=${to} subject="${subject}"`);
    return;
  }
  try {
    await transporter.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, html });
  } catch (e) {
    console.error('Mail error:', e.message);
  }
};
