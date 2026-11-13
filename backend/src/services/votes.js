import { lockUsers,socialError,visibleProblemWhere } from './socialGraph.js';
import { writeNotification } from './notifications.js';
export const createVotes = db => ({
  async vote(req,problemId,type) {
    if(!['up','down'].includes(type))throw socialError(400,'voteTypeInvalid');
    const candidate=await db.problema.findFirst({where:{id:problemId,...visibleProblemWhere(req)},select:{id:true,usuarioId:true}});
    if(!candidate)throw socialError(404,'problemNotFound');
    return db.$transaction(async tx=>{
      await lockUsers(tx,[req.userId,candidate.usuarioId]);
      const problem=await tx.problema.findFirst({where:{id:problemId,...visibleProblemWhere(req)}});
      if(!problem)throw socialError(404,'problemNotFound');
      const where={usuarioId_problemaId:{usuarioId:req.userId,problemaId:problemId}},tipo=type==='up'?'CONFIRMAR':'RESOLVER';
      const existing=await tx.voto.findUnique({where});let added=false;
      if(existing?.tipo===tipo)await tx.voto.delete({where:{id:existing.id}});
      else if(existing){await tx.voto.update({where:{id:existing.id},data:{tipo}});added=true;}
      else {await tx.voto.create({data:{usuarioId:req.userId,problemaId:problemId,tipo}});added=true;}
      const notification=added&&problem.usuarioId!==req.userId?await writeNotification(tx,{usuarioId:problem.usuarioId,tipo:'VOTO',titulo:'notificationVoteTitle',mensagem:'notificationVoteBody',link:'/problem/'+problemId}):null;
      const updated=await tx.problema.findUnique({where:{id:problemId},include:{categoria:true,usuario:{select:{id:true,nome:true,username:true,fotoPerfil:true}},imagens:true,atualizacoes:{orderBy:{dataCriacao:'desc'}},_count:{select:{votos:true}}}});
      return{problem:updated,notification};
    },{isolationLevel:'ReadCommitted'});
  },
});
