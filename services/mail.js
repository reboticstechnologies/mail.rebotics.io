import nodemailer from 'nodemailer';

let transporter;
function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE ?? 'true') === 'true',
    auth: { user: process.env.SMTP_USER || 'api_token', pass: process.env.SMTP_PASS }
  });
  return transporter;
}

export async function sendMail(message) {
  if (!process.env.SMTP_PASS) throw new Error('SMTP_PASS is not configured');
  return getTransporter().sendMail(message);
}
