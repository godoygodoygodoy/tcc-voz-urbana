import {createHash} from 'node:crypto';
import {problemFilters} from './geography.js';
import {socialError} from './socialGraph.js';
import {visibleProblemWhere} from './socialGraph.js';
import {publicationImages} from './publicationMedia.js';

export async function visibleFeedIds(db,req){
  if(typeof req.query.ids!=='string'||req.query.ids.length>3700)throw socialError(400,'feedCursorInvalid');
  const ids=[...new Set(req.query.ids.split(','))];
  if(ids.length>100||ids.some(id=>!/^[-\w]{1,36}$/.test(id)))throw socialError(400,'feedCursorInvalid');
  return {ids:(await db.problema.findMany({where:{id:{in:ids},...visibleProblemWhere(req)},select:{id:true}})).map(row=>row.id)};
}

export const createFeedListing=db=>async(req,query=req.query)=>{
  const limit=Math.min(15,Math.max(1,Number.parseInt(query.limit,10)||12));
  const page=Math.min(10000,Math.max(1,Number.parseInt(query.page,10)||1));
  const sort=query.sort==='votes'?'votes':'recent',base=problemFilters(req,query);
  if(req.userId){base.AND=[...(base.AND||[]),{usuario:{is:{medidasDestino:{none:{origemId:req.userId,tipo:'SILENCIO'}}}}},{ocultacoes:{none:{usuarioId:req.userId}}}];}
  const scope=createHash('sha256').update(JSON.stringify([req.userId||null,req.isAdmin===true,base,sort])).digest('hex').slice(0,16);
  let boundary;
  if(query.cursor){
    try{
      if(sort!=='recent'||typeof query.cursor!=='string'||query.cursor.length>512)throw Error();
      const [date,id,context]=JSON.parse(Buffer.from(query.cursor,'base64url').toString());
      if(context!==scope||typeof id!=='string'||!/^[-\w]{1,36}$/.test(id)||typeof date!=='string'||new Date(date).toISOString()!==date)throw Error();
      boundary={OR:[{dataCriacao:{lt:new Date(date)}},{dataCriacao:new Date(date),id:{lt:id}}]};
    }catch{throw socialError(400,'feedCursorInvalid');}
  }
  const where=boundary?{AND:[base,boundary]}:base;
  const select={id:true,titulo:true,descricao:true,endereco:true,status:true,dataCriacao:true,editadaEm:true,
    categoria:{select:{id:true,nome:true,icone:true,cor:true}},
    usuario:{select:{id:true,nome:true,username:true,fotoPerfil:true}},
    imagens:{select:{id:true,tipo:true,proporcao:true}},
    ...(req.userId?{votos:{where:{usuarioId:req.userId},select:{id:true}},salvos:{where:{usuarioId:req.userId},select:{id:true}}}:{}),
    _count:{select:{votos:true}},
  };
  const [rows,total]=await Promise.all([
    db.problema.findMany({where,select,take:limit+1,skip:boundary?0:(page-1)*limit,orderBy:[...(sort==='votes'?[{votos:{_count:'desc'}}]:[]),{dataCriacao:'desc'},{id:'desc'}]}),
    query.count==='false'?null:db.problema.count({where:base}),
  ]);
  const hasMore=rows.length>limit,visible=rows.slice(0,limit),last=visible.at(-1);
  return {data:visible.map(row=>({id:row.id,title:row.titulo,description:row.descricao,address:row.endereco,status:row.status,createdAt:row.dataCriacao,isEdited:Boolean(row.editadaEm),
    category:row.categoria?{id:row.categoria.id,name:row.categoria.nome,icon:row.categoria.icone,color:row.categoria.cor}:null,
    author:row.usuario?{id:row.usuario.id,name:row.usuario.nome,username:row.usuario.username,avatar:row.usuario.fotoPerfil}:null,
    images:publicationImages(row.imagens,req,{responsive:true}),votes:row._count.votos,supportedByMe:Boolean(row.votos?.length),savedByMe:Boolean(row.salvos?.length),
  })),total,page,limit,hasMore,nextCursor:hasMore&&sort==='recent'?Buffer.from(JSON.stringify([new Date(last.dataCriacao).toISOString(),last.id,scope])).toString('base64url'):null};
};
