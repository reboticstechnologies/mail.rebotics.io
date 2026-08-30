import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mx.cloudflare.net',
  port: Number(process.env.SMTP_PORT || 465),
  secure: String(process.env.SMTP_SECURE || 'true') === 'true',
  auth: {
    user: process.env.SMTP_USER || 'api_token',
    pass: process.env.SMTP_PASS
  }
});

export async function verifyMailer() {
  if (!process.env.SMTP_PASS) return false;
  await transporter.verify();
  return true;
}

export async function sendMail({ from, to, cc, bcc, subject, text, html, replyTo }) {
  return transporter.sendMail({
    from,
    to,
    cc,
    bcc,
    subject,
    text,
    html,
    replyTo
  });
}
