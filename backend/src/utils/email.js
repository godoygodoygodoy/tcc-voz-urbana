import nodemailer from "nodemailer";

const createTransporter = () => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_PORT || 587) === "465",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

export const sendVerificationEmail = async ({ email, name, token }) => {
  const transporter = createTransporter();
  if (!transporter) return false;

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const verificationUrl = `${frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: "Confirme seu e-mail | Voz Urbana",
    text: `Olá, ${name}! Confirme seu e-mail acessando: ${verificationUrl}`,
    html: `<p>Olá, ${name}!</p><p>Confirme seu e-mail para ativar sua conta:</p><p><a href="${verificationUrl}">${verificationUrl}</a></p>`
  });

  return true;
};

export const sendNotificationEmail = async ({ email, name, title, message, link }) => {
  const transporter = createTransporter();
  if (!transporter) return false;
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: `${title} | Voz Urbana`,
    text: `Olá, ${name}! ${message} ${frontendUrl}${link || ""}`,
    html: `<p>Olá, ${name}!</p><p>${message}</p><p><a href="${frontendUrl}${link || ""}">Abrir no Voz Urbana</a></p>`
  });
  return true;
};