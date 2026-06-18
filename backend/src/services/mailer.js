const nodemailer = require('nodemailer');

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
}

async function sendVerificationEmail({ to, token }) {
  const transporter = createTransporter();
  if (!transporter) {
    return;
  }

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const verifyUrl = `${appUrl.replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(token)}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: 'Confirme seu e-mail na Voz Urbana',
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
        <h2 style="color:#7c3aed">Confirme seu e-mail</h2>
        <p>Sua conta na Voz Urbana foi criada com sucesso. Falta só confirmar este e-mail para ativar o acesso.</p>
        <p><a href="${verifyUrl}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:bold">Confirmar e-mail</a></p>
        <p>Se o botão não funcionar, copie e cole este link no navegador:</p>
        <p style="word-break:break-all">${verifyUrl}</p>
      </div>
    `,
  });
}

module.exports = { sendVerificationEmail };
