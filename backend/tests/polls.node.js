import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createSocialFixture } from './helpers/socialFixture.js';
const call=(f,method,path,actor='a')=>{const req=request(f.app)[method]('/api/polls'+path);return actor?req.set('Authorization','Bearer test-'+actor):req;};
const body={question:'Which improvement comes first?',options:['Lighting','Pavement'],endsAt:new Date(Date.now()+3600000).toISOString()};
test('polls persist one immutable choice per user, including concurrent requests',async()=>{
 const f=await createSocialFixture();try{
 assert.equal((await call(f,'get','/public-post',null).expect(200)).body.poll,null);
 const created=(await call(f,'post','/public-post').send(body).expect(201)).body.poll;assert.equal(created.options.length,2);
 await call(f,'post','/public-post').send(body).expect(409);
 await Promise.all(Array.from({length:12},()=>call(f,'put','/public-post/vote','c').send({optionId:created.options[0].id}).expect(200)));
 assert.equal(f.state.pollVotes.length,1);await call(f,'put','/public-post/vote','c').send({optionId:created.options[1].id}).expect(409);
 await call(f,'put','/public-post/vote','b').send({optionId:created.options[1].id}).expect(200);
 const results=(await call(f,'get','/public-post',null).expect(200)).body.poll;assert.equal(results.total,2);assert.deepEqual(results.options.map(o=>o.percentage),[50,50]);assert.equal(results.votedOptionId,null);
 assert.equal((await call(f,'get','/public-post','c').expect(200)).body.poll.votedOptionId,created.options[0].id);
 }finally{await f.close();}
});
test('polls reject forged options, expired voting, nonauthors, invalid choices and private access',async()=>{
 const f=await createSocialFixture();try{
 await call(f,'post','/public-post',null).send(body).expect(401);await call(f,'post','/public-post','c').send(body).expect(403);
 for(const value of [{...body,question:''},{...body,options:['Same','Same']},{...body,options:['One']},{...body,endsAt:'invalid'},{...body,endsAt:'2020-01-01'}])await call(f,'post','/public-post').send(value).expect(400);
 const created=(await call(f,'post','/public-post').send(body).expect(201)).body.poll;
 const other=(await call(f,'post','/private-post','b').send(body).expect(201)).body.poll;
 await call(f,'put','/public-post/vote','c').send({optionId:other.options[0].id}).expect(400);
 await call(f,'get','/private-post','a').expect(404);await call(f,'put','/private-post/vote','a').send({optionId:other.options[0].id}).expect(404);
 f.state.polls.find(p=>p.id===created.id).encerraEm=new Date(Date.now()-1);
 await call(f,'put','/public-post/vote','c').send({optionId:created.options[0].id}).expect(409);
 const closed=(await call(f,'get','/public-post',null).expect(200)).body.poll;assert.equal(closed.closed,true);assert.equal(closed.total,0);
 }finally{await f.close();}
});
