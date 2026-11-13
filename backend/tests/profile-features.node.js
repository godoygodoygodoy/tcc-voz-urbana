import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {createSocialFixture}from './helpers/socialFixture.js';
import {createProfileFeatures}from '../src/services/profileFeatures.js';
const call=(f,method,path,actor='a')=>{const req=request(f.app)[method]('/api/profile-features'+path);return actor?req.set('Authorization','Bearer test-'+actor):req;};
test('profile statistics count support received, hide saved/watch data from visitors and protect private profiles',async()=>{
 const f=await createSocialFixture();try{
  f.state.votes.push({id:'received',usuarioId:'c',problemaId:'public-post',tipo:'CONFIRMAR'});
  f.state.saved.push({id:'watch',usuarioId:'a',problemaId:'public-post',acompanhando:true});
  f.state.comments.push({id:'received-comment',usuarioId:'c',problemaId:'public-post',texto:'Support',dataCriacao:new Date()});
  const own=(await call(f,'get','/a/stats').expect(200)).body;assert.equal(own.support,1);assert.equal(own.comments,1);assert.equal(own.watched,1);
  const visitor=(await call(f,'get','/a/stats','c').expect(200)).body;assert.equal(visitor.watched,null);
  await call(f,'get','/b/stats','c').expect(404);
  const profile=await request(f.app).get('/api/social/users/a/profile').expect(200);assert.equal(profile.body.likes,1);
 }finally{await f.close();}
});
test('pinning enforces three own posts under concurrent requests and never grants an administrator ownership',async()=>{
 const f=await createSocialFixture();try{
  for(let i=0;i<5;i++)f.state.problems.push({id:'pin-'+i,usuarioId:'a',status:'ABERTO',dataCriacao:new Date()});
  const responses=await Promise.all(Array.from({length:5},(_,i)=>call(f,'put','/pins/pin-'+i)));
  assert.equal(responses.filter(row=>row.status===200).length,3);assert.equal(f.state.problems.filter(row=>row.fixadaEm).length,3);
  f.user('c').admin={nivel:'ADMIN'};await call(f,'put','/pins/public-post','c').expect(403);
  await call(f,'delete','/pins/pin-0').expect(200);await call(f,'put','/pins/pin-4').expect(200);
  assert.equal(f.state.problems.filter(row=>row.fixadaEm).length,3);
 }finally{await f.close();}
});
test('profile covers use scoped media tickets, survive reload, and immediately respect revoked profile access',async()=>{
 const f=await createSocialFixture();try{
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
  await call(f,'put','/me/presentation','b').field('presentation','Real presentation').attach('cover',png,'cover.png').expect(200);
  assert.equal(f.user('b').apresentacao,'Real presentation');
  const hidden=(await request(f.app).get('/api/social/users/b/profile').expect(200)).body;assert.equal(hidden.cover,null);
  f.state.follows.push({id:'approved',followerId:'a',followingId:'b',status:'ACEITA'});
  const profile=(await request(f.app).get('/api/social/users/b/profile').set('Authorization','Bearer test-a').expect(200)).body;
  assert.ok(profile.cover.includes('access='));await request(f.app).get(profile.cover).expect(200);
  f.state.follows=[];await request(f.app).get(profile.cover).expect(404);
  const own=(await call(f,'get','/me/presentation','b').expect(200)).body;assert.equal(own.presentation,'Real presentation');
  await call(f,'put','/me/presentation','b').send({presentation:'',removeCover:true}).expect(200);assert.equal(f.user('b').capaUrl,null);
  await assert.rejects(createProfileFeatures(f.db).update('b',{presentation:'x'.repeat(121)}),{code:'profilePresentationInvalid'});
 }finally{await f.close();}
});
