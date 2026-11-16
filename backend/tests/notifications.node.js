import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createSocialFixture } from './helpers/socialFixture.js';
import { writeNotification } from '../src/services/notifications.js';
import { publishActivity,activityListeners } from '../src/services/activityEvents.js';
import { createMessaging } from '../src/services/messaging.js';
import { createComments } from '../src/services/comments.js';
import { createStories } from '../src/services/stories.js';
import { createVotes } from '../src/services/votes.js';
import { createProblemStatus } from '../src/services/problemStatus.js';
const call=(f,method,path,actor='a')=>{const req=request(f.app)[method]('/api/notifications'+path);return actor?req.set('Authorization','Bearer test-'+actor):req;};
const value={usuarioId:'a',tipo:'VOTO',titulo:'Support',mensagem:'Support received',link:'/problem/public-post'};

test('actors resolve live profiles, distinguish people, enforce privacy per event and preserve unavailable history',async()=>{
 const f=await createSocialFixture();try{
 await Promise.all(Array.from({length:8},()=>writeNotification(f.db,{...value,autorId:'b'})));
 await writeNotification(f.db,{...value,autorId:'c'});assert.equal(f.state.notifications.length,2);
 let rows=(await call(f,'get','?paginated=true').expect(200)).body.data;
 assert.equal(rows.find(row=>row.actor?.id==='c').actor.nome,'Person c');
 assert.equal(rows.find(row=>!row.actor).actorStatus,'restricted');
 assert.equal(rows.some(row=>'autorId' in row||'usuarioId' in row||row.actor?.email),false);
 f.user('c').nome='Updated name';f.user('c').username='updated.username';f.user('c').fotoPerfil='/uploads/avatars/c/real.png';
 rows=(await call(f,'get','').expect(200)).body;
 assert.deepEqual(rows.find(row=>row.actor?.id==='c').actor,{id:'c',nome:'Updated name',username:'updated.username',fotoPerfil:'/uploads/avatars/c/real.png'});
 await writeNotification(f.db,{usuarioId:'a',autorId:'b',tipo:'SEGUIR_SOLICITACAO',titulo:'Request',mensagem:'Request',link:'/profile/b'});
 rows=(await call(f,'get','').expect(200)).body;
 assert.equal(rows.find(row=>row.tipo==='SEGUIR_SOLICITACAO').actor.id,'b');
 assert.equal(rows.find(row=>row.tipo==='VOTO'&&row.actorStatus==='restricted').actor,null);
 f.state.follows.push({id:'accepted',followerId:'a',followingId:'b',status:'ACEITA'});
 assert.equal((await call(f,'get','').expect(200)).body.find(row=>row.tipo==='VOTO'&&row.actor?.id==='b').actor.nome,'Person b');
 // Model the FK's SET NULL on account deletion; notifications themselves survive.
 const count=f.state.notifications.length;for(const row of f.state.notifications)if(row.autorId==='c')row.autorId=null;f.state.users=f.state.users.filter(user=>user.id!=='c');
 rows=(await call(f,'get','').expect(200)).body;assert.equal(rows.length,count);assert.ok(rows.some(row=>row.actor===null&&row.actorStatus==='unavailable'));
 }finally{f.close();}
});

test('real producers record authenticated authors for follows, comments, replies, mentions, stories, votes, messages, status and confirmations',async()=>{
 const f=await createSocialFixture();try{
 const auth=id=>({userId:id,isAdmin:false});
 await request(f.app).post('/api/social/users/a/follow').set('Authorization','Bearer test-c').send({autorId:'b'}).expect(201);
 assert.equal(f.state.notifications.find(n=>n.tipo==='NOVO_SEGUIDOR').autorId,'c');
 await request(f.app).post('/api/social/users/b/follow').set('Authorization','Bearer test-a').expect(201);
 assert.equal(f.state.notifications.find(n=>n.tipo==='SEGUIR_SOLICITACAO').autorId,'a');
 const pending=f.edge('a','b');await request(f.app).patch('/api/social/follow-requests/'+pending.id).set('Authorization','Bearer test-b').send({action:'accept'}).expect(200);
 assert.equal(f.state.notifications.find(n=>n.tipo==='SEGUIR_ACEITA').autorId,'b');
 const comments=createComments(f.db);const parent=await comments.create(auth('b'),'public-post',{texto:'A comment'});
 const reply=await comments.create(auth('c'),'public-post',{texto:'Reply mentioning @person.a',parentId:parent.comment.id});
 assert.ok(reply.notifications.some(n=>n.tipo==='RESPOSTA'));assert.ok(reply.notifications.every(n=>n.autorId==='c'));
 const mentioned=await comments.create(auth('c'),'public-post',{texto:'Hello @person.b'});assert.equal(mentioned.notifications.find(n=>n.tipo==='MENCAO').autorId,'c');
 const voted=await createVotes(f.db).vote(auth('c'),'public-post','up');assert.equal(voted.notification.autorId,'c');
 const stories=createStories(f.db,{notify:writeNotification}),story=await stories.publish('a',{url:'/uploads/posts/a/story.png',mime:'image/png',audience:'PUBLICO'});
 assert.equal((await stories.react('c',story.id,true)).notification.autorId,'c');
 await stories.react('c',story.id,true);assert.equal(f.state.notifications.filter(n=>n.tipo==='STORY').length,1);
 const messaging=createMessaging(f.db,{notify:writeNotification}),conversation=await messaging.open('c','a');assert.equal((await messaging.send('c',conversation.id,'Hello')).notification.autorId,'c');
 await request(f.app).put('/api/tracking/public-post/confirmations').set('Authorization','Bearer test-c').send({choice:'EXISTE',autorId:'b'}).expect(200);
 assert.equal(f.state.notifications.find(n=>n.tipo==='CONFIRMACAO').autorId,'c');
 f.user('c').admin={nivel:'ADMIN'};f.state.saved.push({id:'watch-b',usuarioId:'b',problemaId:'public-post',acompanhando:true});
 const statuses=createProblemStatus(f.db);await statuses.update('c','public-post',{status:'RESOLVIDO'});await statuses.deliverBatch();
 assert.equal(f.state.notifications.find(n=>n.tipo==='STATUS').autorId,'c');assert.equal(f.state.notifications.find(n=>n.tipo==='ACOMPANHAMENTO').autorId,'c');
 }finally{f.close();}
});
test('notification preferences are private, validated and enforced; unread events are deduplicated atomically',async()=>{
 const f=await createSocialFixture();try{
 await call(f,'get','/preferences',null).expect(401);
 const defaults=(await call(f,'get','/preferences').expect(200)).body.preferences;assert.equal(defaults.every(p=>p.enabled),true);
 await call(f,'put','/preferences').send({usuarioId:'b',preferences:[{type:'VOTO',enabled:false}]}).expect(200);
 assert.equal(f.state.notificationPreferences[0].usuarioId,'a');assert.equal(await writeNotification(f.db,value),null);
 await call(f,'put','/preferences').send({preferences:[{type:'VOTO',enabled:'false'}]}).expect(400);
 await call(f,'put','/preferences').send({preferences:[{type:'UNKNOWN',enabled:false}]}).expect(400);
 await call(f,'put','/preferences').send({preferences:[{type:'VOTO',enabled:true}]}).expect(200);
 await Promise.all(Array.from({length:12},()=>writeNotification(f.db,value)));assert.equal(f.state.notifications.length,1);
 const id=f.state.notifications[0].id;await call(f,'patch','/'+id+'/read','b').expect(200);assert.equal(f.state.notifications[0].lida,false);
 await call(f,'patch','/'+id+'/read').expect(200);assert.equal(f.state.notifications[0].lida,true);
 await writeNotification(f.db,value);assert.equal(f.state.notifications.length,2);
 const permanent=await writeNotification(f.db,{...value,eventKey:'comment-once'});await call(f,'patch','/'+permanent.id+'/read').expect(200);await writeNotification(f.db,{...value,eventKey:'comment-once'});assert.equal(f.state.notifications.length,3);
 const unread=(await call(f,'get','?paginated=true&read=false').expect(200)).body;assert.equal(unread.total,1);assert.equal(unread.unread,1);
 await call(f,'patch','/read-all').expect(200);assert.equal((await call(f,'get','?paginated=true&read=true').expect(200)).body.total,3);
 assert.equal((await call(f,'get','?paginated=true','b').expect(200)).body.total,0);
 }finally{await f.close();}
});
test('message persistence and its notification commit together; a notification failure rolls back the send',async()=>{
 const f=await createSocialFixture();try{
 const service=createMessaging(f.db,{notify:writeNotification}),conversation=await service.open('a','b');
 const sent=await service.send('a',conversation.id,'Hello');assert.equal(sent.notification.usuarioId,'b');assert.match(sent.notification.link,/conversation=/);assert.equal(f.state.messages.length,1);
 const failing=createMessaging(f.db,{notify:async()=>{throw Error('Persistence failed');}});await assert.rejects(failing.send('a',conversation.id,'Rollback'));assert.equal(f.state.messages.length,1);
 await call(f,'put','/preferences','b').send({preferences:[{type:'MENSAGEM',enabled:false}]}).expect(200);
 await service.send('a',conversation.id,'Muted notification');assert.equal(f.state.notifications.length,1);assert.equal(f.state.messages.length,2);
 }finally{await f.close();}
});
test('SSE subscribes only to the authenticated account and releases its listener on disconnect',async()=>{
 const f=await createSocialFixture({streaming:true}),server=f.app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));const controller=new AbortController();
 try{
 const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/notifications/stream',{headers:{Authorization:'Bearer test-a'},signal:controller.signal});assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/text\/event-stream/);const reader=response.body.getReader();await reader.read();assert.equal(activityListeners('a'),1);
 publishActivity('b','FORBIDDEN');publishActivity('a','MENSAGEM');const frame=new TextDecoder().decode((await reader.read()).value);assert.match(frame,/MENSAGEM/);assert.doesNotMatch(frame,/FORBIDDEN/);
 controller.abort();for(let i=0;i<50&&activityListeners('a');i++)await new Promise(resolve=>setTimeout(resolve,10));assert.equal(activityListeners('a'),0);
 }finally{controller.abort();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await f.close();}
});
