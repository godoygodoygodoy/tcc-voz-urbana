import { prisma } from '../config/prisma.js';
import { sendNotificationEmail } from './email.js';
import { writeNotification } from '../services/notifications.js';
import { publishActivity } from '../services/activityEvents.js';
export const announceNotification = async notification => {
  if (!notification) return;
  publishActivity(notification.usuarioId,notification.tipo);
  if (process.env.SEND_NOTIFICATION_EMAIL === 'true') {
    const user = await prisma.usuario.findUnique({where:{id:notification.usuarioId},select:{email:true,nome:true}});
    if(user)await sendNotificationEmail({email:user.email,name:user.nome,title:notification.titulo,message:notification.mensagem,link:notification.link});
  }
};
export const createNotification = async data => {
  const notification = await writeNotification(prisma,data);
  // Delivery failures must not undo a notification already persisted in MySQL.
  void announceNotification(notification).catch(error=>console.error(JSON.stringify({event:'notification_delivery_pending',code:error.code||error.name})));
  return notification;
};
export const notifyProblemOwner = async ({problem,tipo,titulo,mensagem,eventKey}) => !problem?.usuarioId ? null : createNotification({usuarioId:problem.usuarioId,tipo,titulo,mensagem,eventKey,link:'/problem/'+problem.id});
