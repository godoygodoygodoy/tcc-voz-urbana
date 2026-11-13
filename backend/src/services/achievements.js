import { canViewProfile,lockUsers,socialError,visibleProblemWhere } from './socialGraph.js';
import { writeNotification } from './notifications.js';
export const ACHIEVEMENTS = [
  {code:'PRIMEIRO_REGISTRO',metric:'posts',goal:1},
  {code:'CIDADAO_PARTICIPATIVO',metric:'posts',goal:5},
  {code:'VOZ_ATIVA',metric:'support',goal:10},
  {code:'FISCAL_DA_CIDADE',metric:'watched',goal:10},
  {code:'AGENTE_DE_MUDANCA',metric:'resolved',goal:1},
  {code:'COMUNIDADE_ATIVA',metric:'discussions',goal:3},
];
export function createAchievements(db) {
  const evaluated=new Map();
  const reconcile=async(userId,{force=false}={})=>{
    if(!force&&Date.now()-(evaluated.get(userId)||0)<60000)return [];
    const notifications=await db.$transaction(async tx=>{
      await lockUsers(tx,[userId]);
      if(!force&&Date.now()-(evaluated.get(userId)||0)<60000)return [];
      const owner=await tx.usuario.findUnique({where:{id:userId},select:{id:true,admin:{select:{id:true}}}});if(!owner)return [];
      const existing=await tx.conquistaUsuario.findMany({where:{usuarioId:userId},select:{codigo:true}}),known=new Set(existing.map(row=>row.codigo));
      if(ACHIEVEMENTS.every(definition=>known.has(definition.code)))return [];
      const [posts,support,watched,resolved,discussions]=await Promise.all([
        tx.problema.count({where:{usuarioId:userId}}),
        tx.voto.count({where:{tipo:'CONFIRMAR',usuarioId:{not:userId},problema:{is:{usuarioId:userId}}}}),
        tx.publicacaoSalva.count({where:{usuarioId:userId,acompanhando:true,problema:{is:visibleProblemWhere({userId,isAdmin:Boolean(owner.admin)})}}}),
        tx.problema.count({where:{usuarioId:userId,status:'RESOLVIDO'}}),
        tx.comentario.groupBy({by:['problemaId'],where:{usuarioId:userId,problema:{is:{usuarioId:{not:userId}}}},orderBy:{problemaId:'asc'},take:3}),
      ]);
      const metrics={posts,support,watched,resolved,discussions:discussions.length},notifications=[];
      for(const definition of ACHIEVEMENTS){
        if(known.has(definition.code)||metrics[definition.metric]<definition.goal)continue;
        await tx.conquistaUsuario.upsert({where:{usuarioId_codigo:{usuarioId:userId,codigo:definition.code}},create:{usuarioId:userId,codigo:definition.code},update:{}});
        const notification=await writeNotification(tx,{usuarioId:userId,tipo:'CONQUISTA',titulo:'achievementUnlockedTitle',mensagem:'achievementNotification'+definition.code,link:'/profile/'+userId,eventKey:'achievement:'+definition.code});
        if(notification)notifications.push(notification);
      }
      return notifications;
    },{isolationLevel:'ReadCommitted'});
    evaluated.delete(userId);evaluated.set(userId,Date.now());if(evaluated.size>1000)evaluated.delete(evaluated.keys().next().value);
    return notifications;
  };
  return {reconcile,async list(req,userId){
    const owner=await db.usuario.findUnique({where:{id:userId},select:{id:true,perfilPrivado:true}});
    if(!owner||!await canViewProfile(db,owner,req.userId,req.isAdmin===true))throw socialError(404,'profileNotFound');
    const notifications=await reconcile(userId);
    const rows=await db.conquistaUsuario.findMany({where:{usuarioId:userId},orderBy:{desbloqueadaEm:'asc'}});
    const achievements=ACHIEVEMENTS.map(definition=>({code:definition.code,goal:definition.goal,unlockedAt:rows.find(row=>row.codigo===definition.code)?.desbloqueadaEm||null})).filter(row=>req.userId===userId||row.unlockedAt);
    return {data:achievements,notifications};
  }};
}
