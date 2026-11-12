import test from 'node:test';
import assert from 'node:assert/strict';
import { createSocialMemory } from './helpers/socialMemory.js';
import { createMessaging } from '../src/services/messaging.js';
import { createSocialFixture } from './helpers/socialFixture.js';
import request from 'supertest';

test('history is bounded, deterministic at identical timestamps and keeps cumulative quotas',async()=>{
 const f=createSocialMemory();const messaging=createMessaging(f.db);const conversation=await messaging.open('a','b');
 const date=new Date('2026-11-01T00:00:00Z');
 for(let i=0;i<125;i++)f.state.messages.push({id:String(i).padStart(4,'0'),conversaId:conversation.id,remetenteId:i%2?'b':'a',texto:'history '+i,criadaEm:date});
 const latest=await messaging.history('a',conversation.id);assert.equal(latest.messages.length,50);assert.equal(latest.messages[0].id,'0075');assert.equal(latest.pageInfo.hasOlder,true);assert.equal(latest.messaging.sent,63);assert.equal(latest.messaging.canSend,false);
 const older=await messaging.history('a',conversation.id,{before:latest.messages[0].id});assert.equal(older.messages[0].id,'0025');assert.equal(older.messages.at(-1).id,'0074');
 const oldest=await messaging.history('a',conversation.id,{before:older.messages[0].id});assert.equal(oldest.messages.length,25);assert.equal(oldest.pageInfo.hasOlder,false);
 const merged=[...oldest.messages,...older.messages,...latest.messages];assert.equal(new Set(merged.map(m=>m.id)).size,125);
 const after=await messaging.history('a',conversation.id,{after:'0074'});assert.deepEqual(after.messages.map(m=>m.id),latest.messages.map(m=>m.id));
 assert.deepEqual((await messaging.history('a',conversation.id,{after:'0124'})).messages,[]);
 await assert.rejects(messaging.history('c',conversation.id),{status:404});
 const second=await messaging.open('a','c');f.state.messages.push({id:'foreign',conversaId:second.id,remetenteId:'a',criadaEm:date,texto:'private'});
 await assert.rejects(messaging.history('a',conversation.id,{after:'foreign'}),{status:404});
});

test('comments paginate without changing direct API privacy checks',async()=>{
 const f=await createSocialFixture();try{
 const post=f.state.problems.find(p=>p.usuarioId==='b');assert.ok(post);
 f.user('b').perfilPrivado=false;
 f.state.comments.length=0;for(let i=0;i<75;i++)f.state.comments.push({id:String(i).padStart(3,'0'),problemaId:post.id,usuarioId:'a',texto:'comment '+i,dataCriacao:new Date('2026-11-01')});
 const url='/api/comments/'+post.id;
 const first=await request(f.app).get(url+'?paginated=true&page=1').expect(200);assert.equal(first.body.data.length,30);assert.equal(first.body.hasMore,true);
 const last=await request(f.app).get(url+'?paginated=true&page=3').expect(200);assert.equal(last.body.data.length,15);assert.equal(last.body.hasMore,false);
 const legacy=await request(f.app).get(url).expect(200);assert.equal(legacy.body.length,30);
 f.user('b').perfilPrivado=true;
 await request(f.app).get(url+'?paginated=true&page=2').expect(404);
 }finally{await f.close();}
});
