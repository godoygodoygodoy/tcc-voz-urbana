import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {createSocialFixture} from './helpers/socialFixture.js';
test('feed pages use a bounded projection, stable cursors and no count after the first page',async()=>{
 const f=await createSocialFixture();try{
  f.state.problems.length=0;for(let i=0;i<29;i++)f.state.problems.push({id:'post-'+String(i).padStart(3,'0'),usuarioId:'a',titulo:'Isolated pagination fixture',descricao:'Preserved',status:'ABERTO',dataCriacao:new Date('2026-11-01T00:00:00Z')});
  f.state.saved.push({id:'saved-page',usuarioId:'c',problemaId:'post-028'});f.state.votes.push({id:'vote-page',usuarioId:'c',problemaId:'post-028',tipo:'CONFIRMAR'});
  const find=f.db.problema.findMany.bind(f.db.problema);let calls=0;
  f.db.problema.findMany=async args=>{calls++;assert.equal(args.select.atualizacoes,undefined);assert.equal(args.include,undefined);assert.equal(args.take,13);return find(args);};
  const get=params=>request(f.app).get('/api/problems').query({view:'feed',limit:12,...params}).set('Authorization','Bearer test-c');
  const first=(await get({}).expect(200)).body;assert.equal(first.data.length,12);assert.equal(first.total,29);assert.equal(first.hasMore,true);assert.equal(first.data[0].supportedByMe,true);assert.equal(first.data[0].savedByMe,true);
  assert.equal('atualizacoes' in first.data[0],false);assert.equal('usuario' in first.data[0],false);
  f.state.problems.push({id:'newer',usuarioId:'a',titulo:'Newer',dataCriacao:new Date(),status:'ABERTO'});
  f.db.problema.count=async()=>assert.fail('next cursor page must not run COUNT');
  const second=(await get({cursor:first.nextCursor,count:'false',page:2}).expect(200)).body;
  const third=(await get({cursor:second.nextCursor,count:'false',page:3}).expect(200)).body;
  assert.equal(third.hasMore,false);assert.equal(third.data.length,5);assert.equal(second.total,null);assert.equal(new Set([...first.data,...second.data,...third.data].map(row=>row.id)).size,29);assert.equal(calls,3);
  await get({cursor:first.nextCursor,status:'RESOLVIDO',count:'false'}).expect(400);await get({cursor:'invalid',count:'false'}).expect(400);
 }finally{f.close();}
});
test('visibility revalidation and feed states protect private profiles and scope users',async()=>{
 const f=await createSocialFixture();try{
  const get=(query,actor='a')=>request(f.app).get('/api/problems').query(query).set('Authorization','Bearer test-'+actor);
  const feed=(await get({view:'feed'}).expect(200)).body;assert.equal(feed.data.some(row=>row.id==='private-post'),false);
  assert.deepEqual((await get({view:'visibility',ids:'private-post,public-post'}).expect(200)).body.ids,['public-post']);
  await get({view:'visibility',ids:'bad/identifier'}).expect(400);
  f.state.follows.push({id:'allowed',followerId:'a',followingId:'b',status:'ACEITA'});
  const next=(await get({view:'feed'}).expect(200)).body;assert.equal(next.data.some(row=>row.id==='private-post'),true);
  const image=next.data.find(row=>row.id==='private-post').images[0];assert.equal(image.variants.length,3);assert.equal(image.url.includes('/uploads/'),false);
  f.state.follows=[];assert.deepEqual((await get({view:'visibility',ids:'private-post'}).expect(200)).body.ids,[]);
  // Existing list contract used by maps/detail integrations remains available.
  assert.ok(Array.isArray((await get({limit:10}).expect(200)).body.data));
 }finally{f.close();}
});
