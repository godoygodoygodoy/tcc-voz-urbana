import assert from 'node:assert/strict';

// Deterministic isolated database double. Mutations assert the row-lock protocol.
export function createSocialMemory() {
  const state = { users: ['a','b','c'].map(id => ({ id, nome: `Person ${id}`, username: `person.${id}`, perfilPrivado: false, nivel: 'USUARIO', dataCriacao: new Date('2026-01-01'), apresentacao:null,capaUrl:null,bio: '', fotoPerfil: null, admin: null })), follows: [], conversations: [], messages: [], notifications: [], problems: [], saved: [], votes: [], comments: [], images: [], collections: [], collectionItems: [], stories: [], storyViews: [], polls: [], pollOptions: [], pollVotes: [], notificationPreferences: [], achievements: [], statusHistory: [], statusDeliveries: [], logs: [], stages: [], confirmations: [], visits: [], categories: [] };
  let counter = 0, queue = Promise.resolve(), locks = null;
  const queries = [];
  const user = id => state.users.find(row => row.id === id);
  const edge = (followerId, followingId) => state.follows.find(row => row.followerId === followerId && row.followingId === followingId);
  const matches = (row, where = {}, kind) => {
    if (!row) return false;
    return Object.entries(where).every(([key, value]) => {
      if (value === undefined) return true;
      if (value === null && row[key] === undefined) return true;
      if (key === 'admin' && value && 'isNot' in value) return Boolean(row.admin);
      if (key === 'OR') return value.some(item => matches(row,item,kind));
      if (key === 'AND') return value.every(item => matches(row,item,kind));
      if (key === 'followerId_followingId' || key === 'usuarioAId_usuarioBId') return matches(row,value,kind);
      if (key === 'votos' || key === 'comentarios') { const rows=(key==='votos'?state.votes:state.comments).filter(item=>item.problemaId===row.id);return 'some' in value?rows.some(item=>matches(item,value.some)):!rows.some(item=>matches(item,value.none)); }
      if (key === 'salvo') return matches(state.saved.find(s => s.id === row.salvoId), value.is || value, 'saved');
      if (key === 'usuarioId_codigo') return matches(row,value,kind);
      if (key === 'usuarioId_tipo') return matches(row,value,kind);
      if (key === 'usuarioId_enqueteId') return matches(row,value,kind);
      if (key === 'storyId_usuarioId' || key === 'usuarioId_problemaId' || key === 'colecaoId_salvoId') return matches(row,value,kind);
      if (key === 'usuario') return matches(user(row.usuarioId),value.is || value,'user');
      if (key === 'seguindo') return state.follows.some(item => item.followerId === row.id && matches(item,value.some,'follow'));
      if (key === 'seguidores') return state.follows.some(item => item.followingId === row.id && matches(item,value.some,'follow'));
      if (key === 'problema') return matches(state.problems.find(item => item.id === row.problemaId),value.is || value,'problem');
      if (value && typeof value === 'object' && !(value instanceof Date)) {
        if (['gte','lte','gt','lt'].some(operator=>operator in value)) return row[key] != null && Object.entries(value).every(([operator,boundary])=>operator==='gte'?row[key]>=boundary:operator==='lte'?row[key]<=boundary:operator==='gt'?row[key]>boundary:operator==='lt'?row[key]<boundary:true);
        if ('not' in value) return value.not === null ? row[key] != null : row[key] !== value.not;
        if ('startsWith' in value) return String(row[key] || '').startsWith(value.startsWith);
        if ('contains' in value) return String(row[key] || '').includes(value.contains);
        if ('in' in value) return value.in.includes(row[key]);
      }
      return row[key] instanceof Date && value instanceof Date ? +row[key] === +value : row[key] === value;
    });
  };
  const sort = (rows, orderBy) => [...rows].sort((a,b) => {
    for (const spec of Array.isArray(orderBy) ? orderBy : orderBy ? [orderBy] : []) for (const [key,direction] of Object.entries(spec)) {
      if(key==='_count'){const field=Object.keys(direction)[0],sign=direction[field]==='desc'?-1:1;if(a._count[field]!==b._count[field])return (a._count[field]-b._count[field])*sign;continue;}
      if(a[key]==null&&b[key]!=null)return direction==='desc'?1:-1;
      if(a[key]!=null&&b[key]==null)return direction==='desc'?-1:1;
      if (a[key] < b[key]) return direction === 'desc' ? 1 : -1;
      if (a[key] > b[key]) return direction === 'desc' ? -1 : 1;
    }
    return 0;
  });
  const decorate = (row, kind, args = {}) => {
    if (!row) return null;
    let result = { ...row };
    if (kind === 'statusDelivery') result.historico = decorate(state.statusHistory.find(history=>history.id===row.historicoId),'statusHistory');
    if (kind === 'confirmation') result.usuario=user(row.usuarioId);
    if (kind === 'statusHistory') { result.problema = decorate(state.problems.find(problem=>problem.id===row.problemaId),'problem'); result.usuario=user(row.usuarioId); }
    if (kind === 'user') result._count = { problemas: state.problems.filter(p=>p.usuarioId===row.id).length };
    if (kind === 'problem') result = { ...result, usuario: user(row.usuarioId), etapa:state.stages.find(stage=>stage.codigo===row.etapaCodigo)||null, imagens: state.images.filter(image=>image.problemaId===row.id).length?state.images.filter(image=>image.problemaId===row.id):(row.imagens || []), atualizacoes: [], votos: [], categoria: { id:'cat',nome:'Iluminação',cor:'#abc' }, _count:{votos:state.votes.filter(vote=>vote.problemaId===row.id).length} };
    if (kind === 'conversation' && args.include) result = { ...result, usuarioA:user(row.usuarioAId),usuarioB:user(row.usuarioBId),mensagens:sort(state.messages.filter(m=>m.conversaId===row.id),args.include.mensagens?.orderBy).slice(0,args.include.mensagens?.take) };
    if (kind === 'message') result.remetente = user(row.remetenteId);
    if (kind === 'comment') result = {...result,usuario:user(row.usuarioId),_count:{respostas:state.comments.filter(comment=>comment.parentId===row.id).length}};
    if (kind === 'image') result.problema = decorate(state.problems.find(p=>p.id===row.problemaId),'problem');
    if (kind === 'follow' && args.include) result = { ...result, follower:user(row.followerId), following:user(row.followingId) };
    if (kind === 'poll') result.opcoes = sort(state.pollOptions.filter(option=>option.enqueteId===row.id),{ordem:'asc'}).map(option=>({...option,_count:{votos:state.pollVotes.filter(vote=>vote.opcaoId===option.id).length}}));
    if (kind === 'story') result = {...result,usuario:user(row.usuarioId),visualizacoes:state.storyViews.filter(v=>v.storyId===row.id&&(!args.include?.visualizacoes?.where?.usuarioId||v.usuarioId===args.include.visualizacoes.where.usuarioId)),_count:{visualizacoes:state.storyViews.filter(v=>v.storyId===row.id).length}};
    if (kind === 'collection') result.usuario = user(row.usuarioId);
    if (kind === 'collectionItem') result.salvo = decorate(state.saved.find(s => s.id === row.salvoId), 'saved');
    if (kind === 'saved' || kind === 'vote') result.problema = decorate(state.problems.find(p=>p.id===row.problemaId),'problem');
    return structuredClone(result);
  };
  const lockedUsers = ids => { assert.ok(locks,'mutation must run in a transaction');for (const id of ids) assert.ok(locks.has(`usuarios:${id}`),`missing user lock: ${id}`); };
  const model = (key,kind) => ({
    async findUnique(args) { return decorate(state[key].find(row=>matches(row,args.where,kind)),kind,args); },
    async findFirst(args={}) { return decorate(state[key].find(row=>matches(row,args.where,kind)),kind,args); },
    async findMany(args={}) { return sort(state[key].filter(row=>matches(row,args.where,kind)),args.orderBy).slice(args.skip||0,args.take===undefined?undefined:(args.skip||0)+args.take).map(row=>decorate(row,kind,args)); },
    async groupBy(args) {
      const groups=new Map();
      for(const row of state[key].filter(row=>matches(row,args.where,kind))){
        const id=JSON.stringify(args.by.map(field=>row[field]));
        let group=groups.get(id);if(!group){group={...Object.fromEntries(args.by.map(field=>[field,row[field]])),_count:{_all:0}};groups.set(id,group);}
        group._count._all++;for(const field of new Set([...args.by,...Object.keys(args._count||{}).filter(field=>field!=='_all')]))group._count[field]=(group._count[field]||0)+(row[field]==null?0:1);
      }
      return sort([...groups.values()],args.orderBy).slice(args.skip||0,args.take===undefined?undefined:(args.skip||0)+args.take);
    },
    async count(args={}) { return state[key].filter(row=>matches(row,args.where,kind)).length; },
    async create({data,...args}) {
      if(kind==='message') { const conversation=state.conversations.find(c=>c.id===data.conversaId);lockedUsers([conversation.usuarioAId,conversation.usuarioBId]);assert.ok(locks.has(`conversas:${data.conversaId}`),'message write must lock the conversation'); }
      let generatedId;do{generatedId=kind+'-'+(++counter);}while(state[key].some(row=>row.id===generatedId));
      const row={id:generatedId,criadaEm:new Date(),atualizadaEm:new Date(),...(kind==='story'?{excluidoEm:null}:{}),...(['notification','comment','statusHistory'].includes(kind)?{dataCriacao:new Date()}:{}),...(kind==='notification'?{lida:false}:{}),...(kind==='comment'?{parentId:null}:{}),...(kind==='achievement'?{desbloqueadaEm:new Date()}:{}),...(kind==='confirmation'?{registradaEm:new Date()}:{}),...(kind==='saved'?{acompanhando:false}:{}),...data};state[key].push(row);if(kind==='poll'&&data.opcoes?.create){for(const option of data.opcoes.create)state.pollOptions.push({id:'pollOption-'+(++counter),enqueteId:row.id,...option});delete row.opcoes;}return decorate(row,kind,args);
    },
    async update({where,data,...args}) { const row=state[key].find(r=>matches(r,where,kind));assert.ok(row);if(kind==='user')lockedUsers([row.id]);if(kind==='follow')lockedUsers([row.followerId,row.followingId]);Object.assign(row,data);return decorate(row,kind,args); },
    async updateMany({where,data}) { if(kind==='follow')lockedUsers([where.followingId]);let count=0;for(const row of state[key])if(matches(row,where,kind)){Object.assign(row,data);count++;}return {count}; },
    async delete({where}) { const index=state[key].findIndex(row=>matches(row,where,kind));assert.ok(index>=0);const row=state[key][index];if(kind==='follow')lockedUsers([row.followerId,row.followingId]);state[key].splice(index,1);if(kind==='collection')state.collectionItems=state.collectionItems.filter(i=>i.colecaoId!==row.id);return row; },
    async deleteMany({where}) { if(kind==='follow')lockedUsers([where.followerId,where.followingId]);let count=0;state[key]=state[key].filter(row=>{if(matches(row,where,kind)){count++;return false;}return true;});return {count}; },
    async upsert({where,create,update,...args}) {
      if(kind==='follow')lockedUsers([create.followerId,create.followingId]);
      if(kind==='conversation')lockedUsers([create.usuarioAId,create.usuarioBId]);
      const row=state[key].find(row=>matches(row,where,kind));
      if(row){Object.assign(row,update);return decorate(row,kind,args);}return this.create({data:create,...args});
    },
  });
  const db = {
    visita:model('visits','visit'),categoria:model('categories','category'),etapaProblema:model('stages','stage'),confirmacaoProblema:model('confirmations','confirmation'),atualizacaoProblema:model('statusHistory','statusHistory'),entregaAtualizacao:model('statusDeliveries','statusDelivery'),log:model('logs','log'),conquistaUsuario:model('achievements','achievement'),notificacao:model('notifications','notification'),preferenciaNotificacao:model('notificationPreferences','notificationPreference'),enquete:model('polls','poll'),enqueteOpcao:model('pollOptions','pollOption'),votoEnquete:model('pollVotes','pollVote'),story:model('stories','story'),storyVisualizacao:model('storyViews','storyView'),colecao:model('collections','collection'),itemColecao:model('collectionItems','collectionItem'),usuario:model('users','user'),seguimento:model('follows','follow'),conversa:model('conversations','conversation'),mensagem:model('messages','message'),problema:model('problems','problem'),publicacaoSalva:model('saved','saved'),voto:model('votes','vote'),comentario:model('comments','comment'),imagem:model('images','image'),
    async $queryRaw(strings,...values) { const sql=strings.join('?');assert.match(sql,/FOR UPDATE/);assert.ok(locks);const table=sql.includes('FROM usuarios')?'usuarios':sql.includes('FROM problemas')?'problemas':sql.includes('FROM entregas_atualizacao')?'entregas_atualizacao':'conversas';locks.add(`${table}:${values[0]}`);queries.push({table,id:values[0]});return [{id:values[0]}]; },
    async $transaction(fn,options) {
      assert.equal(options.isolationLevel,'ReadCommitted');
      const previous=queue;let release;queue=new Promise(resolve=>{release=resolve;});await previous;
      const before=structuredClone(state);locks=new Set();
      try{return await fn(db);}catch(error){Object.assign(state,before);throw error;}finally{locks=null;release();}
    },
  };
  return {db,state,queries,user,edge};
}
