import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {createSocialFixture} from './helpers/socialFixture.js';
const api=(f,method,path,user='a')=>request(f.app)[method](path).set('Authorization','Bearer test-'+user);
test('groups reuse real messages, enforce membership and individual nonmutual quotas and protect replies',async()=>{
 const f=await createSocialFixture();try{
 const group=(await api(f,'post','/api/conversations/groups').send({type:'GRUPO',name:'Isolated group',members:['c']}).expect(201)).body;
 await api(f,'get','/api/conversations/'+group.id+'/messages','b').expect(404);
 const first=(await api(f,'post','/api/conversations/'+group.id+'/messages').send({texto:'First real isolated group message'}).expect(201)).body.message;
 await api(f,'post','/api/conversations/'+group.id+'/messages','c').send({texto:'A reply',replyId:first.id}).expect(201);
 await api(f,'post','/api/conversations/'+group.id+'/messages').send({texto:'Second'}).expect(201);await api(f,'post','/api/conversations/'+group.id+'/messages').send({texto:'Third'}).expect(201);await api(f,'post','/api/conversations/'+group.id+'/messages').send({texto:'Over quota'}).expect(403);
 const history=(await api(f,'get','/api/conversations/'+group.id+'/messages').expect(200)).body;assert.equal(history.messages.length,4);assert.equal(history.messages.find(message=>message.respostaId===first.id).resposta.id,first.id);assert.equal(f.state.messages.length,4);
 const direct=(await api(f,'post','/api/conversations/c').expect(201)).body;await api(f,'post','/api/conversations/'+direct.id+'/messages').send({texto:'Foreign reply rejected',replyId:first.id}).expect(400);
 await api(f,'put','/api/conversations/'+group.id+'/messages/'+first.id+'/reaction','c').send({emoji:'💜'}).expect(200);assert.equal(f.state.messageReactions.length,1);
 assert.ok((await api(f,'get','/api/conversations').expect(200)).body.some(row=>row.id===group.id));
 }finally{await f.close();}
});
test('only authorized users create broadcast channels, writers are admins, and membership actions retain history',async()=>{
 const f=await createSocialFixture();try{
 const body={type:'CANAL',name:'Isolated channel',members:['c']};await api(f,'post','/api/conversations/groups').send(body).expect(403);f.user('a').admin={nivel:'ADMIN'};
 const channel=(await api(f,'post','/api/conversations/groups').send(body).expect(201)).body;await api(f,'post','/api/conversations/'+channel.id+'/messages','c').send({texto:'Subscribers cannot broadcast'}).expect(403);
 for(let i=0;i<5;i++)await api(f,'post','/api/conversations/'+channel.id+'/messages').send({texto:'Broadcast '+i}).expect(201);
 await api(f,'put','/api/conversations/'+channel.id+'/members/a').send({action:'leave'}).expect(409);
 await api(f,'put','/api/conversations/'+channel.id+'/members/c').send({action:'promote'}).expect(200);
 await api(f,'put','/api/conversations/'+channel.id+'/members/a').send({action:'leave'}).expect(200);
 await api(f,'get','/api/conversations/'+channel.id+'/messages').expect(404);assert.equal(f.state.messages.length,5);
 await api(f,'put','/api/conversations/'+channel.id+'/read','c').expect(200);assert.ok(f.state.conversationMembers.find(member=>member.usuarioId==='c').lidaAte);
 }finally{await f.close();}
});

test('group replies do not disclose blocked authors through an accessible child message',async()=>{
 const f=await createSocialFixture();try{
  f.user('b').perfilPrivado=false;
  const group=(await api(f,'post','/api/conversations/groups').send({type:'GRUPO',name:'Private quote regression',members:['b','c']}).expect(201)).body;
  const first=(await api(f,'post','/api/conversations/'+group.id+'/messages').send({texto:'Parent hidden after block'}).expect(201)).body.message;
  await api(f,'post','/api/conversations/'+group.id+'/messages','c').send({texto:'Accessible child',replyId:first.id}).expect(201);
  await api(f,'put','/api/social-safety/users/a/block','b').send({enabled:true}).expect(200);
  const history=(await api(f,'get','/api/conversations/'+group.id+'/messages','b').expect(200)).body;
  assert.equal(history.messages.length,1);assert.equal(history.messages[0].texto,'Accessible child');assert.equal(history.messages[0].resposta,null);
 }finally{await f.close();}
});
