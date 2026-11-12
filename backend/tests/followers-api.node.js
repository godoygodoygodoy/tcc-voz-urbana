import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createSocialFixture, TEST_SECRET } from './helpers/socialFixture.js';

const call=(app,method,url,actor)=>{const r=request(app)[method](url);return actor?r.set('Authorization',`Bearer test-${actor}`):r;};

test('private profile/posts/comments/saved/likes/media are protected on direct API requests',async()=>{
 const f=await createSocialFixture();try{
  const profile=(await call(f.app,'get','/api/social/users/b/profile','a')).body;assert.equal(profile.canViewPosts,false);assert.deepEqual(profile.publications,[]);assert.equal(profile.publicationCount,1);
  assert.equal((await call(f.app,'get','/api/problems','a')).body.data.length,1);
  for(const url of ['/api/problems/private-post','/api/comments/private-post','/api/media/private-image','/uploads/reports/b/pixel.png','/uploads/avatars/%2e%2e%2freports/b/pixel.png'])assert.equal((await call(f.app,'get',url,'a')).status,404,url);
  assert.equal((await call(f.app,'get','/api/social/users/b/followers','a')).status,403);
  assert.deepEqual((await call(f.app,'get','/api/saved','a')).body,[]);assert.equal(f.state.saved.length,1);
  assert.deepEqual((await call(f.app,'get','/api/social/users/a/likes','a')).body,[]);
  assert.equal((await call(f.app,'post','/api/votes/private-post','a').send({type:'up'})).status,404);
  assert.equal((await call(f.app,'post','/api/saved/private-post','a')).status,404);
  assert.equal((await call(f.app,'get','/api/problems/private-post','c').set('x-role','admin')).status,404);
  const follow=(await call(f.app,'post','/api/social/users/b/follow','a')).body;assert.equal(follow.pending,true);
  assert.equal((await call(f.app,'patch',`/api/social/follow-requests/${follow.requestId}`,'c').send({action:'accept'})).status,403);
  assert.equal((await call(f.app,'patch',`/api/social/follow-requests/${follow.requestId}`,'b').send({action:'accept'})).status,200);
  const allowed=(await call(f.app,'get','/api/social/users/b/profile','a')).body;assert.equal(allowed.canViewPosts,true);assert.equal(allowed.followers,1);assert.equal(allowed.publications.length,1);
  assert.equal((await call(f.app,'get','/api/comments/private-post','a')).body.length,1);
  assert.equal((await call(f.app,'get','/api/saved','a')).body.length,1);
  assert.equal((await call(f.app,'get','/api/social/users/a/likes','a')).body.length,1);
  assert.equal((await call(f.app,'get','/api/social/users/b/followers','a')).body.data[0].id,'a');
  const imageURL=allowed.publications[0].images[0].url;assert.match(imageURL,/^\/api\/media\//);assert.equal((await call(f.app,'get',imageURL)).status,200);
  await call(f.app,'delete','/api/social/users/b/follow','a');
  assert.equal((await call(f.app,'get',imageURL)).status,404,'old image ticket must recheck current privacy');
  const forged=jwt.sign({imageId:'private-image',viewerId:'b'},'wrong-secret',{audience:'publication-image'});
  assert.equal((await call(f.app,'get','/api/media/private-image?access='+forged)).status,404);
  const wrongScope=jwt.sign({imageId:'other-image',viewerId:'b'},TEST_SECRET,{audience:'publication-image'});
  assert.equal((await call(f.app,'get','/api/media/private-image?access='+wrongScope)).status,404);
  f.user('c').admin={id:'admin-c'};assert.equal((await call(f.app,'get','/api/problems/private-post','c')).status,200);
 }finally{f.close();}
});
test('privacy setting is validated, persists and preserves followers; becoming public approves pending requests',async()=>{
 const f=await createSocialFixture();try{
  assert.equal((await call(f.app,'put','/api/users/me','b').send({isPrivate:'invalid'})).status,400);
  const pending=(await call(f.app,'post','/api/social/users/b/follow','a')).body;assert.equal(pending.pending,true);
  const result=await call(f.app,'put','/api/users/me','b').field('isPrivate','false');assert.equal(result.status,200);assert.equal(result.body.isPrivate,false);
  assert.equal(f.edge('a','b').status,'ACEITA');
  await call(f.app,'put','/api/users/me','b').send({isPrivate:true});assert.equal(f.edge('a','b').status,'ACEITA');
  assert.equal((await call(f.app,'get','/api/social/users/b/profile','a')).body.canViewPosts,true);
  const c=(await call(f.app,'post','/api/social/users/b/follow','c')).body;assert.equal(c.pending,true);
  const requests=(await call(f.app,'get','/api/social/follow-requests/received','b')).body;assert.equal(requests.length,1);assert.equal(requests[0].follower.id,'c');
  assert.equal((await call(f.app,'get','/api/users/me','b')).body.isPrivate,true);
 }finally{f.close();}
});
test('HTTP chat enforces per-sender quota, ignores spoofed counters/identity and keeps history readable',async()=>{
 const f=await createSocialFixture();try{
  assert.equal((await call(f.app,'post','/api/conversations/b')).status,401);
  const conversation=(await call(f.app,'post','/api/conversations/b','a')).body;assert.equal(conversation.messaging.remaining,3);
  const sends=await Promise.all(Array.from({length:10},(_,i)=>call(f.app,'post',`/api/conversations/${conversation.id}/messages`,'a').send({texto:`message ${i}`,remetenteId:'b',remaining:999,mutual:true})));
  assert.equal(sends.filter(r=>r.status===201).length,3);assert.equal(sends.filter(r=>r.status===403).length,7);assert.ok(sends.filter(r=>r.status===403).every(r=>r.body.code==='MESSAGE_LIMIT_REACHED'));
  assert.ok(f.state.messages.every(m=>m.remetenteId==='a'));
  assert.equal((await call(f.app,'get',`/api/conversations/${conversation.id}/messages`,'a')).body.messages.length,3);
  assert.equal((await call(f.app,'get',`/api/conversations/${conversation.id}/messages`,'b')).body.messaging.remaining,3);
  assert.equal((await call(f.app,'get',`/api/conversations/${conversation.id}/messages`,'c')).status,404);
  assert.equal((await call(f.app,'post',`/api/conversations/${conversation.id}/messages`,'c').send({texto:'intruder'})).status,404);
  assert.equal((await call(f.app,'get','/api/conversations','a')).body.length,1);
  await call(f.app,'put','/api/users/me','b').send({isPrivate:false});await call(f.app,'post','/api/social/users/b/follow','a');await call(f.app,'post','/api/social/users/a/follow','b');
  assert.equal((await call(f.app,'post',`/api/conversations/${conversation.id}/messages`,'a').send({texto:'unlimited'})).status,201);
  await call(f.app,'delete','/api/social/users/a/follow','b');
  assert.equal((await call(f.app,'get',`/api/conversations/${conversation.id}/messages`,'a')).body.messages.length,4);
  assert.equal((await call(f.app,'post',`/api/conversations/${conversation.id}/messages`,'a').send({texto:'no reset'})).status,403);
  assert.equal((await call(f.app,'post','/api/conversations/a','b')).body.id,conversation.id);
 }finally{f.close();}
});
