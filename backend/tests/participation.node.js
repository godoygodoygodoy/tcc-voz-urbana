import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createSocialFixture } from './helpers/socialFixture.js';
import { createAchievements } from '../src/services/achievements.js';
const call=(f,method,path,actor='a')=>{const req=request(f.app)[method]('/api/participation'+path);return actor?req.set('Authorization','Bearer test-'+actor):req;};
test('watching is private, idempotent and reuses saved rows without deleting collection membership',async()=>{
 const f=await createSocialFixture();try{
 await call(f,'put','/problems/public-post/watch',null).expect(401);
 await Promise.all(Array.from({length:5},()=>call(f,'put','/problems/public-post/watch').expect(200)));
 assert.equal(f.state.saved.filter(row=>row.usuarioId==='a'&&row.problemaId==='public-post').length,1);
 assert.equal((await call(f,'get','/problems/public-post/watch').expect(200)).body.watching,true);
 await call(f,'delete','/problems/public-post/watch').expect(200);assert.equal(f.state.saved.filter(row=>row.problemaId==='public-post').length,1);assert.equal((await call(f,'get','/problems/public-post/watch').expect(200)).body.watching,false);
 await call(f,'put','/problems/private-post/watch').expect(404);
 f.state.follows.push({id:'approved',followerId:'a',followingId:'b',status:'ACEITA'});await call(f,'put','/problems/private-post/watch').expect(200);f.state.follows=[];
 await call(f,'get','/problems/private-post/watch').expect(404);await call(f,'delete','/problems/private-post/watch').expect(200);assert.equal(f.state.saved.find(row=>row.problemaId==='private-post').acompanhando,false);
 }finally{await f.close();}
});
test('achievements derive only from persisted activity, ignore self support and cannot be unlocked by request payload',async()=>{
 const f=await createSocialFixture();try{
 const service=createAchievements(f.db);await service.reconcile('a',{force:true});assert.deepEqual(f.state.achievements.map(row=>row.codigo),['PRIMEIRO_REGISTRO']);
 for(let i=0;i<10;i++){
  f.state.problems.push({id:'owned-'+i,usuarioId:'a',status:i===0?'RESOLVIDO':'ABERTO',dataCriacao:new Date(),imagens:[]});
  f.state.votes.push({id:'self-'+i,usuarioId:'a',problemaId:'owned-'+i,tipo:'CONFIRMAR'});
  f.state.problems.push({id:'other-'+i,usuarioId:'c',status:'ABERTO',dataCriacao:new Date(),imagens:[]});
  f.state.saved.push({id:'watch-'+i,usuarioId:'a',problemaId:'other-'+i,acompanhando:true});
  if(i<3)f.state.comments.push({id:'discussion-'+i,usuarioId:'a',problemaId:'other-'+i,texto:'Real discussion',dataCriacao:new Date()});
 }
 await service.reconcile('a',{force:true});assert.equal(f.state.achievements.some(row=>row.codigo==='VOZ_ATIVA'),false);
 for(let i=0;i<10;i++)f.state.votes.push({id:'support-'+i,usuarioId:'c',problemaId:'owned-'+i,tipo:'CONFIRMAR'});
 await Promise.all(Array.from({length:5},()=>service.reconcile('a',{force:true})));assert.equal(f.state.achievements.length,6);assert.equal(f.state.notifications.filter(n=>n.tipo==='CONQUISTA').length,6);
 await call(f,'post','/users/a/achievements').send({posts:999,score:999}).expect(404);
 f.user('a').perfilPrivado=true;await call(f,'get','/users/a/achievements','c').expect(404);
 const own=(await call(f,'get','/users/a/achievements').expect(200)).body;assert.equal(own.data.length,6);assert.equal(own.data.every(row=>row.unlockedAt),true);
 }finally{await f.close();}
});
