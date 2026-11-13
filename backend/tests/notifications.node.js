import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createSocialFixture } from './helpers/socialFixture.js';
import { writeNotification } from '../src/services/notifications.js';
import { publishActivity,activityListeners } from '../src/services/activityEvents.js';
import { createMessaging } from '../src/services/messaging.js';
const call=(f,method,path,actor='a')=>{const req=request(f.app)[method]('/api/notifications'+path);return actor?req.set('Authorization','Bearer test-'+actor):req;};
const value={usuarioId:'a',tipo:'VOTO',titulo:'Support',mensagem:'Support received',link:'/problem/public-post'};
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
