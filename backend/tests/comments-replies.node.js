import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createSocialFixture } from './helpers/socialFixture.js';
const call=(f,method,id,actor='a')=>{const req=request(f.app)[method]('/api/comments/'+id);return actor?req.set('Authorization','Bearer test-'+actor):req;};
test('comment replies stay in their own post and mentions notify only eligible recipients',async()=>{
 const f=await createSocialFixture();try{
 const root=(await call(f,'post','public-post','b').send({texto:'A root comment'}).expect(201)).body;
 const reply=(await call(f,'post','public-post','c').send({texto:'Reply for @person.b',parentId:root.id}).expect(201)).body;
 assert.equal(reply.parentId,root.id);assert.equal(reply.usuarioId,'c');
 const roots=(await call(f,'get','public-post?paginated=true',null).expect(200)).body;assert.equal(roots.total,1);assert.equal(roots.commentTotal,2);assert.equal(roots.data[0].replyCount,1);
 const children=(await call(f,'get','public-post/'+root.id+'/replies',null).expect(200)).body;assert.equal(children.total,1);assert.equal(children.data[0].id,reply.id);
 assert.ok(f.state.notifications.some(n=>n.usuarioId==='b'&&n.tipo==='RESPOSTA'));assert.equal(f.state.notifications.some(n=>n.usuarioId==='c'),false);
 await call(f,'post','public-post','a').send({texto:'Nested reply',parentId:reply.id}).expect(400);
 await call(f,'post','public-post','a').send({texto:'Foreign reply',parentId:'comment-1'}).expect(404);
 await call(f,'post','public-post','a').send({texto:'Hello @person.c.'}).expect(201);assert.ok(f.state.notifications.some(n=>n.usuarioId==='c'&&n.tipo==='MENCAO'));
 const count=f.state.comments.length;await call(f,'post','public-post','a').send({texto:{bad:true}}).expect(400);assert.equal(f.state.comments.length,count);
 }finally{await f.close();}
});
test('a private post does not leak through replies or mention notifications after permission changes',async()=>{
 const f=await createSocialFixture();try{
 await call(f,'get','private-post/comment-1/replies','a').expect(404);
 f.state.follows.push({id:'approved',followerId:'a',followingId:'b',status:'ACEITA'});
 await call(f,'post','private-post','a').send({texto:'Hello @person.c',parentId:'comment-1'}).expect(201);
 assert.equal(f.state.notifications.some(n=>n.usuarioId==='c'),false);
 assert.equal(f.state.notifications.some(n=>n.usuarioId==='b'&&n.tipo==='RESPOSTA'),true);
 f.state.follows=[];await call(f,'get','private-post/comment-1/replies','a').expect(404);
 }finally{await f.close();}
});
