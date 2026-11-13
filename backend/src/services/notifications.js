import { createHash } from 'node:crypto';
import { socialError } from './socialGraph.js';
export const NOTIFICATION_TYPES = ['NOVO_SEGUIDOR','SEGUIR_SOLICITACAO','SEGUIR_ACEITA','VOTO','COMENTARIO','RESPOSTA','MENCAO','MENSAGEM','STORY','ACOMPANHAMENTO','STATUS','CONQUISTA'];
export const notificationFields = { id:true,tipo:true,titulo:true,mensagem:true,lida:true,link:true,dataCriacao:true };
const internalFields = { ...notificationFields, usuarioId:true };
export async function writeNotification(db, { usuarioId, tipo, titulo, mensagem, link, eventKey }) {
  if (!usuarioId) return null;
  const preference = await db.preferenciaNotificacao.findUnique({ where: { usuarioId_tipo: { usuarioId, tipo } }, select: { ativa:true } });
  if (preference?.ativa === false) return null;
  const permanent = Boolean(eventKey);
  if (!permanent) {
    const existing = await db.notificacao.findFirst({ where: { usuarioId,tipo,link:link||null,lida:false },select:internalFields });
    if (existing) return existing;
  }
  const identity = JSON.stringify([usuarioId,tipo,eventKey || link || null]);
  const chaveEvento = (permanent ? 'event:' : 'active:') + createHash('sha256').update(identity).digest('hex');
  return db.notificacao.upsert({ where:{chaveEvento},update:{},create:{usuarioId,tipo,titulo,mensagem,link:link||null,chaveEvento},select:internalFields });
}
export async function markNotificationsRead(db, userId, id) {
  return db.$transaction(async tx => {
    const where = { usuarioId:userId,...(id?{id}:{}),lida:false };
    const active = await tx.notificacao.updateMany({where:{...where,chaveEvento:{startsWith:'active:'}},data:{lida:true,chaveEvento:null}});
    const rest = await tx.notificacao.updateMany({where,data:{lida:true}});
    return active.count + rest.count;
  },{isolationLevel:'ReadCommitted'});
}
export async function saveNotificationPreferences(db,userId,preferences) {
  if (!Array.isArray(preferences) || preferences.length > NOTIFICATION_TYPES.length || preferences.some(value=>!NOTIFICATION_TYPES.includes(value?.type)||typeof value.enabled!=='boolean') || new Set(preferences.map(value=>value.type)).size!==preferences.length) throw socialError(400,'notificationPreferencesInvalid');
  await db.$transaction(async tx => {
    for (const value of preferences) await tx.preferenciaNotificacao.upsert({where:{usuarioId_tipo:{usuarioId:userId,tipo:value.type}},create:{usuarioId:userId,tipo:value.type,ativa:value.enabled},update:{ativa:value.enabled}});
  },{isolationLevel:'ReadCommitted'});
}
export async function getNotificationPreferences(db,userId) {
  const values = await db.preferenciaNotificacao.findMany({where:{usuarioId:userId},select:{tipo:true,ativa:true}});
  return NOTIFICATION_TYPES.map(type=>({type,enabled:values.find(value=>value.tipo===type)?.ativa!==false}));
}
