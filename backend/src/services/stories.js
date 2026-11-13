import { lockUsers, publicUser, socialError, visibleUserWhere } from './socialGraph.js';
export const STORY_AUDIENCES = ['PUBLICO','SEGUIDORES','AMIGOS','SO_EU'];
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
export const serializeStory = (row, viewerId) => ({ id:row.id,author:row.usuario,mime:row.mime,audience:row.audiencia,createdAt:row.criadaEm,expiresAt:row.expiraEm,viewed:row.usuarioId===viewerId||Boolean(row.visualizacoes?.length),reaction:row.visualizacoes?.[0]?.reacao||null,...(row.usuarioId===viewerId?{viewCount:row._count?.visualizacoes||0}:{}),hasPoster:Boolean(row.posterUrl) });
export const createStories = (db, { notify = async () => null } = {}) => ({
 async list(viewerId,query={}) {
  const page=Math.min(10000,Math.max(1,Number.parseInt(query.page,10)||1)),limit=30;
  const where={...storyVisibilityWhere(viewerId),...(typeof query.owner==='string'?{usuarioId:query.owner}:{})};
  const [total,rows]=await Promise.all([db.story.count({where}),db.story.findMany({where,include:include(viewerId),orderBy:[{criadaEm:'desc'},{id:'asc'}],skip:(page-1)*limit,take:limit})]);
  return{data:rows.map(row=>serializeStory(row,viewerId)),total,page,limit};
 },
 async get(viewerId,id) {
  const row=await db.story.findFirst({where:{id,...storyVisibilityWhere(viewerId)},include:include(viewerId)});
  if(!row)throw socialError(404,'storyUnavailable');
  return row;
 },
 async publish(viewerId,{url,posterUrl,mime,audience}) {
  if(!STORY_AUDIENCES.includes(audience))throw socialError(400,'storyAudienceInvalid');
  return db.$transaction(async tx=>{
   await lockUsers(tx,[viewerId]);
   if(await tx.story.count({where:{usuarioId:viewerId,excluidoEm:null,expiraEm:{gt:new Date()}}})>=20)throw socialError(429,'storyLimitReached');
   const row=await tx.story.create({data:{usuarioId:viewerId,url,posterUrl,mime,audiencia:audience,expiraEm:new Date(Date.now()+86400000)},include:include(viewerId)});
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
   const notification=enabled?await notify(tx,{usuarioId:row.usuarioId,tipo:'STORY',titulo:'notificationStoryTitle',mensagem:'notificationStoryBody',link:'/feed?story='+encodeURIComponent(id),eventKey:'storyReaction:'+id+':'+viewerId}):null;
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
  try{await removeFiles([row.url,row.posterUrl].filter(Boolean));await db.story.delete({where:{id:row.id}});removed++;}
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
