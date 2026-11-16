import {isBlocked,unblockedUserWhere,assertInteractionAllowed} from './socialGraph.js';
﻿import { createHash } from 'node:crypto';
import { socialError, visibleUserWhere } from './socialGraph.js';
export const NOTIFICATION_TYPES = ['REPOST','NOVO_SEGUIDOR','SEGUIR_SOLICITACAO','SEGUIR_ACEITA','VOTO','COMENTARIO','RESPOSTA','MENCAO','MENSAGEM','STORY','ACOMPANHAMENTO','STATUS','CONQUISTA','CONFIRMACAO'];
export const notificationFields = { id:true,tipo:true,titulo:true,mensagem:true,lida:true,link:true,dataCriacao:true,autorId:true };
const internalFields = { ...notificationFields, usuarioId:true };
const directSocialTypes = new Set(['NOVO_SEGUIDOR','SEGUIR_SOLICITACAO','SEGUIR_ACEITA','AMIZADE_SOLICITACAO','AMIZADE_ACEITA']);
// Bounded batch lookups per page, never one request per notification. Public identity
// of a direct follow/request is already visible in the existing request/profile UI.
// Other private actors must still be accessible to this recipient at read time.
export async function presentNotifications(db, rows, viewerId, isAdmin=false) {
  const ids=[...new Set(rows.map(row=>row.autorId).filter(Boolean))];
  const direct=rows.filter(row=>directSocialTypes.has(row.tipo)).map(row=>row.autorId).filter(Boolean);
  const select={id:true,nome:true,username:true,fotoPerfil:true};
  const [actors,directActors]=await Promise.all([
    ids.length?db.usuario.findMany({where:{AND:[{id:{in:ids}},visibleUserWhere(viewerId,isAdmin)]},select}):[],
    direct.length?db.usuario.findMany({where:{id:{in:direct},...unblockedUserWhere(viewerId)},select}):[],
  ]);
  const index=actors=>new Map(actors.map(actor=>[actor.id,{id:actor.id,nome:actor.nome,username:actor.username,fotoPerfil:actor.fotoPerfil}]));
  const byId=index(actors),directById=index(directActors);
  return rows.map(row=>{
    const {autorId,...item}=Object.fromEntries(Object.keys(notificationFields).map(key=>[key,row[key]]));
    const actor=byId.get(autorId)||(directSocialTypes.has(row.tipo)?directById.get(autorId):null)||null;
    // Historical bodies may contain a former display name. Do not disclose it
    // after the actor becomes inaccessible; keep the original record intact.
    const unavailable = !actor && autorId;
    return {...item,...(unavailable?{mensagem:'notificationActorRestricted',link:null}:!actor&&directSocialTypes.has(row.tipo)?{link:null}:{}),actor,actorStatus:actor?'available':autorId?'restricted':'unavailable'};
  });
}
export async function writeNotification(db, { usuarioId, autorId=null, tipo, titulo, mensagem, link, eventKey }) {
  if (!usuarioId) return null;
  if(autorId&&await isBlocked(db,autorId,usuarioId))return null;
  if(tipo==='MENCAO'&&autorId){try{await assertInteractionAllowed(db,autorId,usuarioId,'mencoes');}catch(error){if(error.code==='socialInteractionUnavailable')return null;throw error;}}
  const preference = await db.preferenciaNotificacao.findUnique({ where: { usuarioId_tipo: { usuarioId, tipo } }, select: { ativa:true } });
  if (preference?.ativa === false) return null;
  const permanent = Boolean(eventKey);
  if (!permanent) {
    const existing = await db.notificacao.findFirst({ where: { usuarioId,autorId,tipo,link:link||null,lida:false },select:internalFields });
    if (existing) return existing;
  }
  // Keep permanent event identities compatible with delivery retries and history.
  const identity = JSON.stringify([usuarioId,tipo,eventKey || link || null,...(!permanent&&autorId?[autorId]:[])]);
  const chaveEvento = (permanent ? 'event:' : 'active:') + createHash('sha256').update(identity).digest('hex');
  return db.notificacao.upsert({ where:{chaveEvento},update:autorId?{autorId}:{},create:{usuarioId,autorId,tipo,titulo,mensagem,link:link||null,chaveEvento},select:internalFields });
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
