import { lockUsers, publicUser, socialError, visibleUserWhere } from './socialGraph.js';
export const STORY_AUDIENCES = ['PUBLICO','SEGUIDORES','AMIGOS','SO_EU'];
import { validateComposition,validateStickerAnswer,INTERACTIVE_STICKERS } from './storyComposition.js';
import { mediaProviders } from './mediaProviders.js';
export const storyVisibilityWhere = (viewerId, now = new Date()) => ({
 excluidoEm: null, expiraEm: { gt: now },
 OR: [
  ...(viewerId ? [{ usuarioId: viewerId }] : []),
  { AND: [
    { usuario: { is: visibleUserWhere(viewerId) } },
    { OR: [
      { audiencia:'PUBLICO' },
      ...(viewerId ? [
       { audiencia:'SEGUIDORES', usuario:{is:{seguidores:{some:{followerId:viewerId,status:'ACEITA'}}}} },
       { audiencia:'AMIGOS', usuario:{is:{AND:[{seguidores:{some:{followerId:viewerId,status:'ACEITA'}}},{seguindo:{some:{followingId:viewerId,status:'ACEITA'}}}]}} },
      ] : []),
    ] },
  ] },
 ],
});
const include = viewerId => ({ usuario:{select:publicUser},visualizacoes:{where:{usuarioId:viewerId},select:{id:true,reacao:true}},_count:{select:{visualizacoes:true}} });
export const serializeStory = (row, viewerId) => ({ id:row.id,author:row.usuario,mime:row.mime,composition:row.composicao||null,audience:row.audiencia,createdAt:row.criadaEm,expiresAt:row.expiraEm,viewed:row.usuarioId===viewerId||Boolean(row.visualizacoes?.length),reaction:row.visualizacoes?.[0]?.reacao||null,...(row.usuarioId===viewerId?{viewCount:row._count?.visualizacoes||0}:{}),hasPoster:Boolean(row.posterUrl) });
export const createStories = (db, { notify = async () => null, resolveMusic = id=>mediaProviders.song(id) } = {}) => ({
 async existingPublication(viewerId,key,hash) {
  if(!key)return null;
  const row=await db.story.findFirst({where:{usuarioId:viewerId,chavePublicacao:key},include:include(viewerId)});
  if(!row)return null;
  if(row.hashPublicacao!==hash)throw socialError(409,'storyPublicationConflict');
  if(row.excluidoEm||+new Date(row.expiraEm)<=Date.now())throw socialError(409,'storyUnavailable');
  return serializeStory(row,viewerId);
 },
 async answer(viewerId,id,elementId,value) {
  const candidate=await this.get(viewerId,id);
  return db.$transaction(async tx=>{
   await lockUsers(tx,[viewerId,candidate.usuarioId]);
   const row=await tx.story.findFirst({where:{id,...storyVisibilityWhere(viewerId)}});
   if(!row)throw socialError(404,'storyUnavailable');
   if(row.usuarioId===viewerId)throw socialError(403,'storySelfReaction');
   const element=row.composicao?.elements.find(item=>item.id===elementId);
   if(!element||!INTERACTIVE_STICKERS.includes(element.type))throw socialError(400,'storyCompositionInvalid');
   const answer=validateStickerAnswer(element,value);
   if(element.type==='countdown'&&+new Date(element.endsAt)<=Date.now())throw socialError(400,'storyUnavailable');
   return tx.storyResposta.upsert({where:{storyId_elementoId_usuarioId:{storyId:id,elementoId:elementId,usuarioId:viewerId}},create:{storyId:id,elementoId:elementId,usuarioId:viewerId,valor:answer},update:{},select:{elementoId:true,valor:true}});
  },{isolationLevel:'ReadCommitted'});
 },
 async answers(viewerId,id,elementId,query={}) {
  const row=await this.get(viewerId,id);
  const element=row.composicao?.elements.find(item=>item.id===elementId);
  if(!element||!INTERACTIVE_STICKERS.includes(element.type))throw socialError(404,'storyUnavailable');
  if(row.usuarioId!==viewerId){const own=await db.storyResposta.findFirst({where:{storyId:id,elementoId:elementId,usuarioId:viewerId},select:{valor:true}});return{own:own?.valor??null};}
  const where={storyId:id,elementoId:elementId};
  const page=Math.min(10000,Math.max(1,parseInt(query.page,10)||1)),limit=30;
  const [rows,total]=await Promise.all([db.storyResposta.findMany({where,orderBy:{criadaEm:'desc'},skip:(page-1)*limit,take:limit,include:{usuario:{select:{id:true,nome:true,username:true,fotoPerfil:true}}}}),db.storyResposta.count({where})]);
  return{data:rows.map(answer=>({id:answer.id,value:answer.valor,user:answer.usuario,createdAt:answer.criadaEm})),total,page,limit};
 },
 async viewers(viewerId,id,query={}) {
  const story=await this.get(viewerId,id);if(story.usuarioId!==viewerId)throw socialError(403,'storyUnavailable');
  const page=Math.min(10000,Math.max(1,Number.parseInt(query.page,10)||1)),limit=30;
  const [rows,total]=await Promise.all([db.storyVisualizacao.findMany({where:{storyId:id},include:{usuario:{select:publicUser}},orderBy:[{criadaEm:'desc'},{id:'asc'}],skip:(page-1)*limit,take:limit}),db.storyVisualizacao.count({where:{storyId:id}})]);
  return{data:rows.map(row=>({id:row.id,viewedAt:row.criadaEm,reaction:row.reacao||null,user:row.usuario?{id:row.usuario.id,nome:row.usuario.nome,username:row.usuario.username,fotoPerfil:row.usuario.fotoPerfil}:null})),total,page,limit};
 },
 async list(viewerId,query={}) {
  const page=Math.min(10000,Math.max(1,Number.parseInt(query.page,10)||1)),limit=30;
  const where={...storyVisibilityWhere(viewerId),...(typeof query.owner==='string'?{usuarioId:query.owner}:{}),...(query.scope==='following'?{AND:[{OR:[{usuarioId:viewerId},{usuario:{is:{seguidores:{some:{followerId:viewerId,status:'ACEITA'}}}}}]}]}:{})};
  const [total,rows]=await Promise.all([db.story.count({where}),db.story.findMany({where,include:include(viewerId),orderBy:[{criadaEm:'desc'},{id:'asc'}],skip:(page-1)*limit,take:limit})]);
  return{data:rows.map(row=>serializeStory(row,viewerId)),total,page,limit};
 },
 async get(viewerId,id) {
  const row=await db.story.findFirst({where:{id,...storyVisibilityWhere(viewerId)},include:include(viewerId)});
  if(!row)throw socialError(404,'storyUnavailable');
  return row;
 },
 async publish(viewerId,{url,posterUrl,mime,audience,composition=null,originalUrl=null,publicationKey=null,publicationHash=null}) {
  if(!STORY_AUDIENCES.includes(audience))throw socialError(400,'storyAudienceInvalid');
  const document=validateComposition(composition);
  for(const element of document?.elements||[])if(element.type==='music')element.reference=await resolveMusic(element.catalogId);
  return db.$transaction(async tx=>{
   await lockUsers(tx,[viewerId]);
   if(publicationKey){const prior=await tx.story.findFirst({where:{usuarioId:viewerId,chavePublicacao:publicationKey},include:include(viewerId)});if(prior){if(prior.hashPublicacao!==publicationHash)throw socialError(409,'storyPublicationConflict');if(prior.excluidoEm||+new Date(prior.expiraEm)<=Date.now())throw socialError(409,'storyUnavailable');return{...serializeStory(prior,viewerId),reused:true};}}
   for(const element of document?.elements||[])if(element.type==='mention'){
    const person=await tx.usuario.findFirst({where:{id:element.userId,...visibleUserWhere(viewerId)},select:publicUser});
    if(!person)throw socialError(400,'storyUnavailable');element.text=person.username?'@'+person.username:person.nome;
   }
   if(await tx.story.count({where:{usuarioId:viewerId,excluidoEm:null,expiraEm:{gt:new Date()}}})>=20)throw socialError(429,'storyLimitReached');
   const row=await tx.story.create({data:{usuarioId:viewerId,url,posterUrl,mime,composicao:document??undefined,originalUrl,chavePublicacao:publicationKey,hashPublicacao:publicationHash,audiencia:audience,expiraEm:new Date(Date.now()+86400000)},include:include(viewerId)});
   for(const userId of new Set((document?.elements||[]).filter(item=>item.type==='mention').map(item=>item.userId))){
    if(userId!==viewerId&&await tx.story.findFirst({where:{id:row.id,...storyVisibilityWhere(userId)}}))await notify(tx,{usuarioId:userId,autorId:viewerId,tipo:'MENCAO',titulo:'notificationMENCAOTitle',mensagem:'storyMentionBody',link:'/feed?story='+encodeURIComponent(row.id),eventKey:'storyMention:'+row.id+':'+userId});
   }
   return serializeStory(row,viewerId);
  },{isolationLevel:'ReadCommitted'});
 },
 async view(viewerId,id) {
  // Serialize with story deletion and privacy changes to avoid a view on a hidden story.
  const candidate=await db.story.findUnique({where:{id},select:{usuarioId:true}});
  if(!candidate)throw socialError(404,'storyUnavailable');
  return db.$transaction(async tx=>{
   await lockUsers(tx,[viewerId,candidate.usuarioId]);
   const row=await tx.story.findFirst({where:{id,...storyVisibilityWhere(viewerId)},include:include(viewerId)});
   if(!row)throw socialError(404,'storyUnavailable');
   const view=row.usuarioId!==viewerId?await tx.storyVisualizacao.upsert({where:{storyId_usuarioId:{storyId:id,usuarioId:viewerId}},create:{storyId:id,usuarioId:viewerId},update:{}}):null;
   return serializeStory({...row,visualizacoes:view?[view]:row.visualizacoes},viewerId);
  },{isolationLevel:'ReadCommitted'});
 },
 async react(viewerId,id,enabled=true) {
  const candidate=await db.story.findUnique({where:{id},select:{usuarioId:true}});
  if(!candidate)throw socialError(404,'storyUnavailable');
  return db.$transaction(async tx=>{
   await lockUsers(tx,[viewerId,candidate.usuarioId]);
   const row=await tx.story.findFirst({where:{id,...storyVisibilityWhere(viewerId)},include:include(viewerId)});
   if(!row)throw socialError(404,'storyUnavailable');
   if(row.usuarioId===viewerId)throw socialError(403,'storySelfReaction');
   const view=await tx.storyVisualizacao.upsert({where:{storyId_usuarioId:{storyId:id,usuarioId:viewerId}},create:{storyId:id,usuarioId:viewerId,reacao:enabled?'heart':null},update:{reacao:enabled?'heart':null}});
   const notification=enabled?await notify(tx,{usuarioId:row.usuarioId,autorId:viewerId,tipo:'STORY',titulo:'notificationStoryTitle',mensagem:'notificationStoryBody',link:'/feed?story='+encodeURIComponent(id),eventKey:'storyReaction:'+id+':'+viewerId}):null;
   return{story:serializeStory({...row,visualizacoes:[view]},viewerId),notification};
  },{isolationLevel:'ReadCommitted'});
 },
 async remove(viewerId,id) {
  return db.$transaction(async tx=>{
   await lockUsers(tx,[viewerId]);
   const row=await tx.story.findFirst({where:{id,usuarioId:viewerId,excluidoEm:null}});
   if(!row)throw socialError(404,'storyUnavailable');
   return tx.story.update({where:{id},data:{excluidoEm:new Date()}});
  },{isolationLevel:'ReadCommitted'});
 },
});
export const cleanExpiredStories = async(db,removeFiles) => {
 const rows=await db.story.findMany({where:{OR:[{expiraEm:{lte:new Date()}},{excluidoEm:{not:null}}]},take:50,orderBy:{expiraEm:'asc'}});
 let removed=0;
 for(const row of rows){
  try{await removeFiles([row.url,row.posterUrl,row.originalUrl].filter(Boolean));await db.story.delete({where:{id:row.id}});removed++;}
  catch(error){console.error(JSON.stringify({event:'story_cleanup_pending',id:row.id,code:error.code||error.name}));}
 }
 return {scanned:rows.length,removed};
};
export function startStoryCleanup(db,removeFiles){
 let stopped=false,timer;
 const run=async()=>{let delay=600000;try{const batch=await cleanExpiredStories(db,removeFiles);if(batch.scanned===50&&batch.removed>0)delay=1000;}catch(error){console.error(JSON.stringify({event:'story_cleanup_unavailable',code:error.code||error.name}));}finally{if(!stopped){timer=setTimeout(run,delay);timer.unref?.();}}};
 timer=setTimeout(run,10000);timer.unref?.();
 return()=>{stopped=true;clearTimeout(timer);};
}
