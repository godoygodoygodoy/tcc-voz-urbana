import { prisma } from "../config/prisma.js";
import { sendNotificationEmail } from "./email.js";

export const createNotification = async ({ usuarioId, tipo, titulo, mensagem, link }) => {
  if (!usuarioId) return null;
  const notification = await prisma.notificacao.create({
    data: { usuarioId, tipo, titulo, mensagem, link }
  });
  if (process.env.SEND_NOTIFICATION_EMAIL === "true") {
    const user = await prisma.usuario.findUnique({ where: { id: usuarioId }, select: { email: true, nome: true } });
    if (user) {
      await sendNotificationEmail({ email: user.email, name: user.nome, title: titulo, message: mensagem, link });
    }
  }
  return notification;
};

export const notifyProblemOwner = async ({ problem, tipo, titulo, mensagem }) => {
  if (!problem?.usuarioId) return null;
  return createNotification({
    usuarioId: problem.usuarioId,
    tipo,
    titulo,
    mensagem,
    link: `/problem/${problem.id}`
  });
};
