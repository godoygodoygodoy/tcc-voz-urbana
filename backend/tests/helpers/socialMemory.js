import assert from 'node:assert/strict';

// Deterministic isolated database double. Mutations assert the row-lock protocol.
export function createSocialMemory() {
  const state = { users: ['a','b','c'].map(id => ({ id, nome: `Person ${id}`, username: `person.${id}`, perfilPrivado: false, nivel: 'USUARIO', dataCriacao: new Date('2026-01-01'), bio: '', fotoPerfil: null, admin: null })), follows: [], conversations: [], messages: [], notifications: [], problems: [], saved: [], votes: [], comments: [], images: [], collections: [], collectionItems: [], stories: [], storyViews: [] };
  let counter = 0, queue = Promise.resolve(), locks = null;
  const queries = [];
  const user = id => state.users.find(row => row.id === id);
  const edge = (followerId, followingId) => state.follows.find(row => row.followerId === followerId && row.followingId === followingId);
  const matches = (row, where = {}, kind) => {
    if (!row) return false;
    return Object.entries(where).every(([key, value]) => {
      if (value === undefined) return true;
      if (key === 'OR') return value.some(item => matches(row,item,kind));
      if (key === 'AND') return value.every(item => matches(row,item,kind));
      if (key === 'followerId_followingId' || key === 'usuarioAId_usuarioBId') return matches(row,value,kind);
      if (key === 'salvo') return matches(state.saved.find(s => s.id === row.salvoId), value.is || value, 'saved');
      if (key === 'storyId_usuarioId' || key === 'usuarioId_problemaId' || key === 'colecaoId_salvoId') return matches(row,value,kind);
      if (key === 'usuario') return matches(user(row.usuarioId),value.is || value,'user');
      if (key === 'seguindo') return state.follows.some(item => item.followerId === row.id && matches(item,value.some,'follow'));
      if (key === 'seguidores') return state.follows.some(item => item.followingId === row.id && matches(item,value.some,'follow'));
      if (key === 'problema') return matches(state.problems.find(item => item.id === row.problemaId),value.is || value,'problem');
      if (value && typeof value === 'object' && !(value instanceof Date)) {
        if ('gte' in value) return row[key] >= value.gte;
        if ('lte' in value) return row[key] <= value.lte;
        if ('gt' in value) return row[key] > value.gt;
        if ('lt' in value) return row[key] < value.lt;
        if ('not' in value) return row[key] !== value.not;
        if ('contains' in value) return String(row[key] || '').includes(value.contains);
        if ('in' in value) return value.in.includes(row[key]);
      }
      return row[key] instanceof Date && value instanceof Date ? +row[key] === +value : row[key] === value;
    });
  };
  const sort = (rows, orderBy) => [...rows].sort((a,b) => {
    for (const spec of Array.isArray(orderBy) ? orderBy : orderBy ? [orderBy] : []) for (const [key,direction] of Object.entries(spec)) {
      if (a[key] < b[key]) return direction === 'desc' ? 1 : -1;
      if (a[key] > b[key]) return direction === 'desc' ? -1 : 1;
    }
    return 0;
  });
  const decorate = (row, kind, args = {}) => {
    if (!row) return null;
    let result = { ...row };
    if (kind === 'user') result._count = { problemas: state.problems.filter(p=>p.usuarioId===row.id).length };
    if (kind === 'problem') result = { ...result, usuario: user(row.usuarioId), imagens: row.imagens || [], atualizacoes: [], votos: [], categoria: { id:'cat',nome:'Iluminação',cor:'#abc' }, _count:{votos:0} };
    if (kind === 'conversation' && args.include) result = { ...result, usuarioA:user(row.usuarioAId),usuarioB:user(row.usuarioBId),mensagens:sort(state.messages.filter(m=>m.conversaId===row.id),args.include.mensagens?.orderBy).slice(0,args.include.mensagens?.take) };
    if (kind === 'message') result.remetente = user(row.remetenteId);
    if (kind === 'comment') result.usuario = user(row.usuarioId);
    if (kind === 'image') result.problema = decorate(state.problems.find(p=>p.id===row.problemaId),'problem');
    if (kind === 'follow' && args.include) result = { ...result, follower:user(row.followerId), following:user(row.followingId) };
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
      const counts = new Map();
      for (const row of state[key].filter(row => matches(row, args.where, kind))) counts.set(row.conversaId, (counts.get(row.conversaId) || 0) + 1);
      return [...counts].map(([conversaId, count]) => ({ conversaId, _count: { _all: count } }));
    },
    async count(args={}) { return state[key].filter(row=>matches(row,args.where,kind)).length; },
    async create({data,...args}) {
      if(kind==='message') { const conversation=state.conversations.find(c=>c.id===data.conversaId);lockedUsers([conversation.usuarioAId,conversation.usuarioBId]);assert.ok(locks.has(`conversas:${data.conversaId}`),'message write must lock the conversation'); }
      const row={id:`${kind}-${++counter}`,criadaEm:new Date(),atualizadaEm:new Date(),...(kind==='story'?{excluidoEm:null}:{}),...data};state[key].push(row);return decorate(row,kind,args);
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
    story:model('stories','story'),storyVisualizacao:model('storyViews','storyView'),colecao:model('collections','collection'),itemColecao:model('collectionItems','collectionItem'),usuario:model('users','user'),seguimento:model('follows','follow'),conversa:model('conversations','conversation'),mensagem:model('messages','message'),problema:model('problems','problem'),publicacaoSalva:model('saved','saved'),voto:model('votes','vote'),comentario:model('comments','comment'),imagem:model('images','image'),
    async $queryRaw(strings,...values) { const sql=strings.join('?');assert.match(sql,/FOR UPDATE/);assert.ok(locks);const table=sql.includes('FROM usuarios')?'usuarios':'conversas';locks.add(`${table}:${values[0]}`);queries.push({table,id:values[0]});return [{id:values[0]}]; },
    async $transaction(fn,options) {
      assert.equal(options.isolationLevel,'ReadCommitted');
      const previous=queue;let release;queue=new Promise(resolve=>{release=resolve;});await previous;
      const before=structuredClone(state);locks=new Set();
      try{return await fn(db);}catch(error){Object.assign(state,before);throw error;}finally{locks=null;release();}
    },
  };
  return {db,state,queries,user,edge};
}
