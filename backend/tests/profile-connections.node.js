import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createSocialFixture } from './helpers/socialFixture.js';
const get=(f,path,actor='a')=>{const call=request(f.app).get('/api/social/users/b/common-connections'+path);return actor?call.set('Authorization','Bearer test-'+actor):call;};
const edge=(f,from,to,status='ACEITA')=>f.state.follows.push({id:from+'-'+to,followerId:from,followingId:to,status,criadaEm:new Date()});

test('common connections use the correct direction, accepted edges, counts and bounded pages',async()=>{
 const f=await createSocialFixture();try{
 f.user('b').perfilPrivado=false;
 edge(f,'c','a');edge(f,'c','b');
 for(let i=0;i<35;i++){
  const id='person-'+String(i).padStart(2,'0');f.state.users.push({id,nome:id,username:id,perfilPrivado:false});edge(f,'a',id);edge(f,'b',id);
 }
 f.state.users.push({id:'pending',nome:'Pending',username:'pending',perfilPrivado:false});edge(f,'pending','a');edge(f,'pending','b','PENDENTE');
 const summary=await get(f,'').expect(200);assert.equal(summary.body.followers.total,1);assert.deepEqual(summary.body.followers.data.map(u=>u.id),['c']);assert.equal(summary.body.following.total,35);assert.equal(summary.body.following.data.length,4);
 assert.equal('email' in summary.body.followers.data[0],false);assert.match(summary.headers['cache-control'],/private, no-store/);
 const page1=await get(f,'?direction=following&page=1').expect(200),page2=await get(f,'?direction=following&page=2').expect(200);
 assert.equal(page1.body.data.length,30);assert.equal(page2.body.data.length,5);assert.equal(new Set([...page1.body.data,...page2.body.data].map(u=>u.id)).size,35);
 f.state.follows=f.state.follows.filter(e=>!(e.followerId==='c'&&e.followingId==='b'));
 assert.equal((await get(f,'').expect(200)).body.followers.total,0);
 await get(f,'?direction=wrong').expect(400);
 }finally{await f.close();}
});

test('common connections protect the owner and private candidate identities on direct API requests',async()=>{
 const f=await createSocialFixture();try{
 await get(f,'',null).expect(401);await get(f,'').expect(403);
 edge(f,'a','b','PENDENTE');await get(f,'?direction=followers').expect(403);
 f.state.follows.find(e=>e.followerId==='a'&&e.followingId==='b').status='ACEITA';
 f.user('c').perfilPrivado=true;edge(f,'c','a');edge(f,'c','b');
 assert.equal((await get(f,'').expect(200)).body.followers.total,0);
 edge(f,'a','c');assert.equal((await get(f,'').expect(200)).body.followers.total,1);
 f.state.follows=f.state.follows.filter(e=>!(e.followerId==='a'&&e.followingId==='b'));
 await get(f,'?direction=following').expect(403);
 }finally{await f.close();}
});

test('profile message entry reuses a canonical conversation and keeps exhausted history accessible',async()=>{
 const f=await createSocialFixture();try{
 const open=actor=>request(f.app).post('/api/conversations/'+(actor==='a'?'b':'a')).set('Authorization','Bearer test-'+actor);
 const replies=await Promise.all([open('a'),open('a'),open('b')]);assert.equal(new Set(replies.map(r=>r.body.id)).size,1);assert.equal(f.state.conversations.length,1);
 const id=replies[0].body.id;
 for(let i=0;i<3;i++)await request(f.app).post('/api/conversations/'+id+'/messages').set('Authorization','Bearer test-a').send({texto:'Message '+i}).expect(201);
 const reopened=await open('a').expect(201);assert.equal(reopened.body.messaging.canSend,false);
 const history=await request(f.app).get('/api/conversations/'+id+'/messages').set('Authorization','Bearer test-a').expect(200);assert.equal(history.body.messages.length,3);
 edge(f,'a','b');edge(f,'b','a');assert.equal((await open('a').expect(201)).body.messaging.canSend,true);
 }finally{await f.close();}
});
