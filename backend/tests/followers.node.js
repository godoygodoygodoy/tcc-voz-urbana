import test from 'node:test';
import assert from 'node:assert/strict';
import { createSocialGraph, relationship, canViewProfile, visibleUserWhere, visibleProblemWhere } from '../src/services/socialGraph.js';
import { createMessaging } from '../src/services/messaging.js';
import { createSocialMemory } from './helpers/socialMemory.js';

const fixture=()=>{const memory=createSocialMemory();return {...memory,graph:createSocialGraph(memory.db),chat:createMessaging(memory.db)};};

test('public follow is immediate, directional, idempotent and mutually derived',async()=>{
 const f=fixture();const r=await f.graph.follow('a','b');assert.equal(r.following,true);assert.equal(r.mutual,false);assert.equal(r.pending,false);
 await Promise.all(Array.from({length:10},()=>f.graph.follow('a','b')));assert.equal(f.state.follows.length,1);
 assert.equal((await relationship(f.db,'b','a')).followedBy,true);
 await f.graph.follow('b','a');assert.equal((await relationship(f.db,'a','b')).mutual,true);
 await f.graph.unfollow('a','b');const next=await relationship(f.db,'a','b');assert.equal(next.following,false);assert.equal(next.followedBy,true);assert.equal(next.mutual,false);assert.equal(f.state.follows.length,1);
 await assert.rejects(f.graph.follow('a','a'),{status:400});await assert.rejects(f.graph.follow('a','missing'),{status:404});
});
test('private requests require the recipient, and refusals/cancellations do not grant access',async()=>{
 const f=fixture();f.user('b').perfilPrivado=true;
 const request=await f.graph.follow('a','b');assert.equal(request.pending,true);assert.equal(request.following,false);
 assert.equal(await canViewProfile(f.db,f.user('b'),'a'),false);
 await assert.rejects(f.graph.respond('c',request.requestId,'accept'),{status:403});
 await assert.rejects(f.graph.respond('a',request.requestId,'accept'),{status:403});
 await f.graph.respond('b',request.requestId,'reject');assert.equal(await canViewProfile(f.db,f.user('b'),'a'),false);
 const again=await f.graph.follow('a','b');assert.equal(again.requestId,request.requestId);
 await f.graph.respond('a',again.requestId,'cancel');assert.equal(f.state.follows.length,0);
 const third=await f.graph.follow('a','b');await f.graph.respond('b',third.requestId,'accept');
 assert.equal(await canViewProfile(f.db,f.user('b'),'a'),true);assert.equal((await relationship(f.db,'a','b')).mutual,false);
 await assert.rejects(f.graph.respond('b',third.requestId,'accept'),{status:409});
});
test('turning private preserves followers and friendship requires both accepted directions',async()=>{
 const f=fixture();await f.graph.follow('a','b');f.user('b').perfilPrivado=true;
 assert.equal(await canViewProfile(f.db,f.user('b'),'a'),true);
 assert.equal(await canViewProfile(f.db,f.user('b'),'c'),false);assert.equal(await canViewProfile(f.db,f.user('b'),undefined),false);
 assert.equal(await canViewProfile(f.db,f.user('b'),'b'),true);assert.equal(await canViewProfile(f.db,f.user('b'),'c',true),true);
 const request=await f.graph.follow('c','b');assert.equal(request.pending,true);
 assert.equal((await relationship(f.db,'b','c')).mutual,false);
 await f.graph.follow('b','c');assert.equal((await relationship(f.db,'b','c')).mutual,false);
 await f.graph.respond('b',request.requestId,'accept');assert.equal((await relationship(f.db,'b','c')).mutual,true);
});
test('each participant gets three messages; history and canonical conversation survive reopening',async()=>{
 const f=fixture();f.user('b').perfilPrivado=true;const c=await f.chat.open('a','b');
 assert.equal(c.messaging.remaining,3);assert.equal((await f.chat.open('b','a')).id,c.id);
 for(const sender of ['a','b']){for(let i=0;i<3;i++){const result=await f.chat.send(sender,c.id,`${sender}: ${i}`);assert.equal(result.messaging.remaining,2-i);}await assert.rejects(f.chat.send(sender,c.id,'fourth'),{status:403,code:'MESSAGE_LIMIT_REACHED'});}
 const history=await f.chat.history('a',c.id);assert.equal(history.messages.length,6);assert.equal(history.messaging.canSend,false);
 assert.equal((await f.chat.list('a')).length,1);assert.equal((await f.chat.open('a','b')).messaging.remaining,0);
 assert.equal((await f.chat.history('b',c.id)).messages.length,6);
});
test('simultaneous sends cannot exceed the budget or borrow another sender budget',async()=>{
 const f=fixture();const c=await f.chat.open('a','b');
 const results=await Promise.allSettled(Array.from({length:20},(_,i)=>f.chat.send(i%2?'a':'b',c.id,`message ${i}`)));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,6);
 assert.equal(f.state.messages.filter(m=>m.remetenteId==='a').length,3);assert.equal(f.state.messages.filter(m=>m.remetenteId==='b').length,3);
 assert.ok(f.queries.some(q=>q.table==='conversas'&&q.id===c.id));
});
test('mutual following unlocks the same history; unfollowing restores limits using all old messages',async()=>{
 const f=fixture();const c=await f.chat.open('a','b');await f.chat.send('a',c.id,'before');
 await f.graph.follow('a','b');await f.graph.follow('b','a');
 for(let i=0;i<5;i++)assert.equal((await f.chat.send('a',c.id,`unlimited ${i}`)).messaging.limit,null);
 assert.equal((await f.chat.history('a',c.id)).messages.length,6);
 await f.graph.unfollow('b','a');assert.equal((await f.chat.history('a',c.id)).messaging.remaining,0);
 await assert.rejects(f.chat.send('a',c.id,'must block'),{code:'MESSAGE_LIMIT_REACHED'});
 assert.equal((await f.chat.history('b',c.id)).messaging.remaining,3);
 await f.graph.follow('b','a');await f.chat.send('a',c.id,'unlocked again');await f.graph.unfollow('b','a');
 await assert.rejects(f.chat.send('a',c.id,'no reset'),{code:'MESSAGE_LIMIT_REACHED'});assert.equal((await f.chat.history('a',c.id)).messages.length,7);
});
test('limits belong to each conversation; nonparticipants cannot read or send',async()=>{
 const f=fixture();const ab=await f.chat.open('a','b'),ac=await f.chat.open('a','c');
 for(let i=0;i<3;i++)await f.chat.send('a',ab.id,'used');assert.equal((await f.chat.send('a',ac.id,'separate budget')).messaging.remaining,2);
 await assert.rejects(f.chat.history('c',ab.id),{status:404});await assert.rejects(f.chat.send('c',ab.id,'intruder'),{status:404});
 await assert.rejects(f.chat.open('a','a'),{status:400});await assert.rejects(f.chat.open('a','missing'),{status:404});
 for(const text of ['', '   ', 'x'.repeat(2001), {texto:'wrong type'}])await assert.rejects(f.chat.send('a',ac.id,text),{status:400});
});
test('public visibility predicates include owner, approved followers and database-verified admins',()=>{
 assert.deepEqual(visibleUserWhere(undefined),{OR:[{perfilPrivado:false}]});assert.equal(visibleUserWhere('a').OR.length,3);assert.deepEqual(visibleUserWhere('a',true),{});
});

test('two private profiles need both approvals before unlimited messages',async()=>{
 const f=fixture();f.user('a').perfilPrivado=true;f.user('b').perfilPrivado=true;
 const conversation=await f.chat.open('a','b');for(let i=0;i<3;i++)await f.chat.send('a',conversation.id,'before approvals');
 const ab=await f.graph.follow('a','b'),ba=await f.graph.follow('b','a');assert.equal(ab.pending,true);assert.equal(ba.pending,true);
 await f.graph.respond('b',ab.requestId,'accept');assert.equal((await f.chat.history('a',conversation.id)).messaging.canSend,false);
 await f.graph.respond('a',ba.requestId,'accept');assert.equal((await f.chat.send('a',conversation.id,'both approved')).messaging.mutual,true);
 assert.equal((await f.chat.history('a',conversation.id)).messages.length,4);
});
test('conversation list aggregates each sender quota without mixing conversations',async()=>{
 const f=fixture(),ab=await f.chat.open('a','b'),ac=await f.chat.open('a','c');
 for(let i=0;i<3;i++)await f.chat.send('a',ab.id,'quota');await f.chat.send('a',ac.id,'other quota');
 const rows=await f.chat.list('a');assert.equal(rows.find(row=>row.id===ab.id).messaging.remaining,0);assert.equal(rows.find(row=>row.id===ac.id).messaging.remaining,2);
 assert.equal((await f.chat.list('b'))[0].messaging.remaining,3);
 await f.graph.follow('a','b');await f.graph.follow('b','a');assert.equal((await f.chat.list('a')).find(row=>row.id===ab.id).messaging.mutual,true);
});

test('private visibility never trusts a role string without a verified admin relation',()=>{
 assert.equal(visibleProblemWhere({userId:'a',userRole:'admin',isAdmin:false}).usuario.is.OR.length,3);
 assert.deepEqual(visibleProblemWhere({userId:'a',isAdmin:true}),{usuario:{is:{}}});
});
