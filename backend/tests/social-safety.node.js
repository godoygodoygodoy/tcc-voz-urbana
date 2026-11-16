import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {createSocialFixture} from './helpers/socialFixture.js';
import {presentNotifications} from '../src/services/notifications.js';
const api=(f,method,path,user='a')=>request(f.app)[method](path).set('Authorization','Bearer test-'+user);
test('blocking is bilateral across profiles, posts, follow, search and message sending while preserving history',async()=>{
 const f=await createSocialFixture();try{
 const conversation=(await api(f,'post','/api/conversations/c').expect(201)).body;
 await api(f,'post','/api/conversations/'+conversation.id+'/messages').send({texto:'Historical text in isolated fixture'}).expect(201);
 await api(f,'put','/api/social-safety/users/c/block').send({enabled:true}).expect(200);
 await api(f,'get','/api/social/users/c/profile').expect(404);await api(f,'get','/api/social/users/a/profile','c').expect(404);
 await api(f,'get','/api/problems/public-post','c').expect(404);
 await api(f,'post','/api/social/users/a/follow','c').expect(403);
 const search=(await api(f,'get','/api/social/users/search?q=person.c').expect(200)).body;assert.equal(search.total,0);
 await api(f,'post','/api/conversations/'+conversation.id+'/messages','c').send({texto:'Forbidden text'}).expect(403);
 const history=(await api(f,'get','/api/conversations/'+conversation.id+'/messages','c').expect(200)).body;assert.equal(history.messages.length,1);assert.equal(history.messaging.canSend,false);
 await api(f,'put','/api/social-safety/users/c/block').send({enabled:false}).expect(200);await api(f,'get','/api/social/users/c/profile').expect(200);assert.equal(f.state.messages.length,1);
 }finally{await f.close();}
});
test('silence and hiding affect discovery only, not access rights or the original publication',async()=>{
 const f=await createSocialFixture();try{
 await api(f,'put','/api/social-safety/users/a/mute','c').send({enabled:true}).expect(200);
 const list=(await api(f,'get','/api/problems?view=feed','c').expect(200)).body;assert.equal(list.data.some(post=>post.id==='public-post'),false);
 await api(f,'get','/api/problems/public-post','c').expect(200);
 await api(f,'put','/api/social-safety/users/a/mute','c').send({enabled:false}).expect(200);
 await api(f,'put','/api/social-safety/hidden/public-post','c').send({enabled:true}).expect(200);
 assert.equal((await api(f,'get','/api/problems?view=feed','c').expect(200)).body.data.some(post=>post.id==='public-post'),false);
 assert.ok(f.state.problems.some(post=>post.id==='public-post'));
 }finally{await f.close();}
});
test('reports are deduplicated, access checked, admin-only and decisions are audited',async()=>{
 const f=await createSocialFixture();try{
 const body={targetType:'PROBLEMA',targetId:'public-post',category:'SPAM',reason:'Isolated test of review workflow'};
 const first=(await api(f,'post','/api/social-safety/reports','c').send(body).expect(201)).body;await api(f,'post','/api/social-safety/reports','c').send(body).expect(201);assert.equal(f.state.socialReports.length,1);
 await api(f,'get','/api/social-safety/reports','c').expect(403);await api(f,'post','/api/social-safety/reports','c').send({...body,targetId:'private-post'}).expect(404);
 f.user('a').admin={nivel:'ADMIN'};await api(f,'patch','/api/social-safety/reports/'+first.id).send({state:'RESOLVIDA',decision:'Reviewed in isolated test; content retained'}).expect(200);assert.equal(f.state.logs.length,1);assert.ok(f.state.problems.some(post=>post.id==='public-post'));
 await api(f,'patch','/api/social-safety/reports/'+first.id).send({state:'REJEITADA',decision:'Cannot overwrite final review'}).expect(409);
 }finally{await f.close();}
});
test('message privacy is enforced by the backend without deleting previous conversations',async()=>{
 const f=await createSocialFixture();try{
 await api(f,'put','/api/social-safety/preferences','c').send({mensagens:'NINGUEM',mencoes:'MUTUOS'}).expect(200);
 await api(f,'post','/api/conversations/c').expect(403);
 await api(f,'put','/api/social-safety/users/a/block').send({enabled:true}).expect(400);
 await request(f.app).get('/api/social-safety/preferences').expect(401);
 }finally{await f.close();}
});

test('blocked identities do not leak through third-party follower lists or historical notification bodies',async()=>{
 const f=await createSocialFixture();try{
  f.user('b').perfilPrivado=false;
  f.state.follows.push({id:'third-party-follow',followerId:'a',followingId:'b',status:'ACEITA'});
  await api(f,'put','/api/social-safety/users/a/block','c').send({enabled:true}).expect(200);
  const list=(await api(f,'get','/api/social/users/b/followers','c').expect(200)).body;
  assert.equal(list.data.some(user=>user.id==='a'),false);
  const rows=await presentNotifications(f.db,[{id:'old-event',usuarioId:'c',autorId:'a',tipo:'STORY',titulo:'notificationStoryTitle',mensagem:'Person a liked your story',link:'/person.a'}],'c');
  assert.equal(rows[0].actor,null);assert.equal(rows[0].mensagem,'notificationActorRestricted');assert.equal(rows[0].link,null);
 }finally{await f.close();}
});
