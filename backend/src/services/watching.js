import { lockUsers,visibleProblemWhere,socialError } from './socialGraph.js';
export const createWatching = db => ({
  async get(req,problemId) {
    if(!await db.problema.findFirst({where:{id:problemId,...visibleProblemWhere(req)},select:{id:true}}))throw socialError(404,'problemNotFound');
    const row=req.userId?await db.publicacaoSalva.findUnique({where:{usuarioId_problemaId:{usuarioId:req.userId,problemaId:problemId}},select:{acompanhando:true}}):null;
    return {watching:Boolean(row?.acompanhando)};
  },
  async set(req,problemId,enabled) {
    const candidate=enabled?await db.problema.findFirst({where:{id:problemId,...visibleProblemWhere(req)},select:{id:true,usuarioId:true}}):null;
    if(enabled&&!candidate)throw socialError(404,'problemNotFound');
    return db.$transaction(async tx=>{
      await lockUsers(tx,enabled?[req.userId,candidate.usuarioId]:[req.userId]);
      if(enabled&&!await tx.problema.findFirst({where:{id:problemId,...visibleProblemWhere(req)},select:{id:true}}))throw socialError(404,'problemNotFound');
      if(enabled)await tx.publicacaoSalva.upsert({where:{usuarioId_problemaId:{usuarioId:req.userId,problemaId:problemId}},create:{usuarioId:req.userId,problemaId:problemId,acompanhando:true},update:{acompanhando:true}});
      else await tx.publicacaoSalva.updateMany({where:{usuarioId:req.userId,problemaId:problemId},data:{acompanhando:false}});
      return {watching:enabled};
    },{isolationLevel:'ReadCommitted'});
  },
});
