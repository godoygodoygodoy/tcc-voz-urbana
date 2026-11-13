import { lockUsers, readersOfProfileWhere, socialError, visibleProblemWhere } from './socialGraph.js';
import { writeNotification } from './notifications.js';
export const commentInclude = { usuario:{select:{id:true,nome:true,username:true,fotoPerfil:true}},_count:{select:{respostas:true}} };
export const commentDto = row => ({ id:row.id,texto:row.texto,dataCriacao:row.dataCriacao,usuarioId:row.usuarioId,problemaId:row.problemaId,parentId:row.parentId||null,usuario:row.usuario,replyCount:row._count?.respostas||0 });
const pageNumber = value => Math.min(10000,Math.max(1,Number.parseInt(value,10)||1));
async function getProblem(db,req,id) {
  const problem=await db.problema.findFirst({where:{id,...visibleProblemWhere(req)},include:{usuario:{select:{id:true,perfilPrivado:true}}}});
  if(!problem)throw socialError(404,'problemNotFound');return problem;
}
function mentionNames(text) {
  const matches=[...text.matchAll(/(?:^|[^\w@])@([a-z0-9._]{3,30})/gi)].slice(0,10).map(match=>match[1].toLowerCase());
  return {matches,names:[...new Set(matches.flatMap(name=>[name,name.replace(/\.+$/,'')]))]};
}
export const createComments = db => ({
  async list(req,problemId,{parentId=null,page:rawPage=1,limit:rawLimit=30}={}) {
    if(parentId!==null&&typeof parentId!=='string')throw socialError(400,'commentUnavailable');
    await getProblem(db,req,problemId);
    if(parentId&&!await db.comentario.findFirst({where:{id:parentId,problemaId:problemId,parentId:null},select:{id:true}}))throw socialError(404,'commentUnavailable');
    const page=pageNumber(rawPage),limit=Math.min(100,Math.max(1,Number.parseInt(rawLimit,10)||30));
    const where={problemaId:problemId,parentId};
    const [rows,total,commentTotal]=await Promise.all([
      db.comentario.findMany({where,include:commentInclude,orderBy:[{dataCriacao:'asc'},{id:'asc'}],skip:(page-1)*limit,take:limit}),
      db.comentario.count({where}),db.comentario.count({where:{problemaId:problemId}}),
    ]);
    return{data:rows.map(commentDto),total,commentTotal,page,limit,hasMore:page*limit<total};
  },
  async create(req,problemId,body) {
    const raw=body?.texto??body?.text;
    if(typeof raw!=='string'||raw.trim().length<2||raw.trim().length>1000)throw socialError(400,'commentTextInvalid');
    const texto=raw.trim(),parentId=body.parentId??null;
    if(parentId!==null&&(typeof parentId!=='string'||!parentId||parentId.length>36))throw socialError(400,'commentUnavailable');
    const candidate=await getProblem(db,req,problemId);
    return db.$transaction(async tx=>{
      await lockUsers(tx,[req.userId,candidate.usuarioId]);
      const problem=await getProblem(tx,req,problemId);
      const parent=parentId?await tx.comentario.findFirst({where:{id:parentId,problemaId:problemId},select:{id:true,usuarioId:true,parentId:true}}):null;
      if(parentId&&!parent)throw socialError(404,'commentUnavailable');
      if(parent?.parentId)throw socialError(400,'commentReplyRoot');
      const comment=await tx.comentario.create({data:{texto,usuarioId:req.userId,problemaId:problemId,parentId},include:commentInclude});
      const recipients=new Map([[problem.usuarioId,'COMENTARIO']]);if(parent)recipients.set(parent.usuarioId,'RESPOSTA');
      const mentions=mentionNames(texto);
      if(mentions.names.length){
        const users=await tx.usuario.findMany({where:{username:{in:mentions.names}},select:{id:true,username:true}});
        for(const name of mentions.matches){const match=users.find(user=>user.username?.toLowerCase()===name)||users.find(user=>user.username?.toLowerCase()===name.replace(/\.+$/,''));if(match&&!recipients.has(match.id))recipients.set(match.id,'MENCAO');}
      }
      recipients.delete(req.userId);
      const allowed=recipients.size?await tx.usuario.findMany({where:{AND:[{id:{in:[...recipients.keys()]}},readersOfProfileWhere(problem.usuario)]},select:{id:true}}):[];
      const notifications=[];
      for(const recipient of allowed){const tipo=recipients.get(recipient.id);const notification=await writeNotification(tx,{usuarioId:recipient.id,tipo,titulo:'notification'+tipo+'Title',mensagem:'notification'+tipo+'Body',link:'/problem/'+problemId+'#comments',eventKey:'comment:'+comment.id+':'+tipo});if(notification)notifications.push(notification);}
      return{comment:{...commentDto(comment),...(parentId?{threadTotal:await tx.comentario.count({where:{parentId}})}:{})},notifications};
    },{isolationLevel:'ReadCommitted'});
  },
});
