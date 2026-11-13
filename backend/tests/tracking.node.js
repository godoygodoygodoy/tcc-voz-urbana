import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {createSocialFixture}from './helpers/socialFixture.js';
import {attachComparison}from '../src/services/comparisons.js';
const call=(f,method,path,actor='a')=>{const query=request(f.app)[method]('/api/tracking'+path);return actor?query.set('Authorization','Bearer test-'+actor):query;};
test('community observations are unique, rate limited, private and never change the official status',async()=>{
 const f=await createSocialFixture();try{
  await call(f,'put','/public-post/confirmations',null).send({choice:'RESOLVIDO'}).expect(401);
  await Promise.all(Array.from({length:5},()=>call(f,'put','/public-post/confirmations','c').send({choice:'RESOLVIDO'}).expect(200)));
  assert.equal(f.state.confirmations.length,1);assert.equal(f.state.problems.find(row=>row.id==='public-post').status,'ABERTO');
  await call(f,'put','/public-post/confirmations','c').send({choice:'EXISTE'}).expect(429);
  f.state.confirmations[0].registradaEm=new Date(Date.now()-86400001);
  const response=await call(f,'put','/public-post/confirmations','c').send({choice:'EXISTE',usuarioId:'a',count:100}).expect(200);
  assert.equal(response.body.choices.find(row=>row.choice==='EXISTE').count,1);assert.equal(f.state.confirmations[0].usuarioId,'c');
  await call(f,'get','/private-post/confirmations','a').expect(404);
  await call(f,'put','/public-post/confirmations').send({choice:'FORGED'}).expect(400);
 }finally{await f.close();}
});
test('configurable stages preserve legacy values, snapshot history, and reject nonadmin and inactive changes',async()=>{
 const f=await createSocialFixture();try{
  const stages=await call(f,'get','/stages',null).expect(200);assert.equal(stages.body.data.length,6);
  const config={name:'Review by staff',status:'ABERTO',color:'#123456',active:true};
  await call(f,'put','/stages/EM_ANALISE').send(config).expect(403);f.user('a').admin={nivel:'ADMIN'};
  await call(f,'put','/stages/EM_ANALISE').send(config).expect(200);
  await request(f.app).put('/api/admin/problems/public-post').set('Authorization','Bearer test-a').send({stageCode:'EM_ANALISE'}).expect(200);
  assert.equal(f.state.problems.find(row=>row.id==='public-post').status,'ABERTO');assert.equal(f.state.statusHistory[0].etapaNome,'Review by staff');
  await call(f,'put','/stages/EM_ANALISE').send({...config,name:'Renamed stage',active:false}).expect(200);
  assert.equal(f.state.statusHistory[0].etapaNome,'Review by staff');
  await request(f.app).put('/api/admin/problems/public-post').set('Authorization','Bearer test-a').send({stageCode:'EM_ANALISE'}).expect(400);
  await call(f,'put','/stages/BAD').send({...config,color:'red;display:none'}).expect(400);
 }finally{await f.close();}
});
test('timeline cursor merges real comments and history without duplicates, preserves content and rechecks access',async()=>{
 const f=await createSocialFixture();try{
  const date=new Date('2026-11-01T12:00:00Z');f.state.problems.find(row=>row.id==='public-post').dataCriacao=new Date('2026-01-01');
  for(let i=0;i<65;i++)f.state.comments.push({id:'timeline-'+String(i).padStart(3,'0'),problemaId:'public-post',usuarioId:'c',texto:'User-written content '+i,dataCriacao:date});
  f.state.statusHistory.push({id:'history',problemaId:'public-post',usuarioId:'a',texto:'Real update',dataCriacao:date});
  const events=[];let cursor;do{const page=(await call(f,'get','/public-post/timeline'+(cursor?'?cursor='+cursor:'')).expect(200)).body;events.push(...page.data);cursor=page.nextCursor;}while(cursor);
  assert.equal(events.length,67);assert.equal(new Set(events.map(row=>row.kind+row.id)).size,67);assert.equal(events.at(-1).kind,'created');
  assert.equal(events.filter(row=>row.kind==='comment').length,65);
  await call(f,'get','/public-post/timeline?cursor=bad').expect(400);
  await call(f,'get','/private-post/timeline').expect(404);
 }finally{await f.close();}
});
test('related posts require an actual relationship and comparison images enforce ownership and atomic persistence',async()=>{
 const f=await createSocialFixture();try{
  f.state.problems.find(row=>row.id==='public-post').categoriaId='cat';
  f.state.problems.push({id:'related',usuarioId:'c',categoriaId:'cat',titulo:'Related by category',status:'ABERTO',dataCriacao:new Date()});
  f.state.problems.push({id:'unrelated',usuarioId:'c',categoriaId:'other',titulo:'Unrelated',status:'ABERTO',dataCriacao:new Date()});
  const result=(await call(f,'get','/public-post/related').expect(200)).body;assert.deepEqual(result.data.map(row=>row.id),['related']);
  await assert.rejects(attachComparison(f.db,'c','public-post',['/before','/after']),{code:'comparisonForbidden'});
  await attachComparison(f.db,'a','public-post',['/before','/after']);
  assert.deepEqual(f.state.images.filter(row=>row.problemaId==='public-post').map(row=>row.tipo),['ANTES','DEPOIS']);
  assert.equal(f.state.statusHistory[0].texto,'comparisonAddedHistory');assert.equal(f.state.problems.find(row=>row.id==='public-post').status,'ABERTO');
 }finally{await f.close();}
});
