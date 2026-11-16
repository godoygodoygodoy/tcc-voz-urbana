import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {createSocialFixture} from './helpers/socialFixture.js';
const api=(f,method,path,user='a')=>request(f.app)[method](path).set('Authorization','Bearer test-'+user);
test('notes are truly temporary, audience protected, editable and only removable by their author',async()=>{
 const f=await createSocialFixture();try{
 const body={text:'Isolated temporary note',audience:'PUBLICO',hours:1};
 const first=(await api(f,'put','/api/publishing/notes/me').send(body).expect(200)).body;
 await api(f,'put','/api/publishing/notes/me').send({...body,text:'Edited note'}).expect(200);assert.equal(f.state.notes.length,1);
 f.state.follows.push({id:'test-follow',followerId:'c',followingId:'a',status:'ACEITA'});
 assert.equal((await api(f,'get','/api/publishing/notes','c').expect(200)).body.data[0].text,'Edited note');
 await api(f,'delete','/api/publishing/notes/'+first.id,'c').expect(404);
 f.user('a').perfilPrivado=true;assert.equal((await api(f,'get','/api/publishing/notes?owner=a','b').expect(200)).body.total,0);
 f.state.notes[0].expiraEm=new Date(Date.now()-1);assert.equal((await api(f,'get','/api/publishing/notes?owner=a','c').expect(200)).body.total,0);
 await api(f,'put','/api/publishing/notes/me').send({...body,hours:100}).expect(400);
 }finally{await f.close();}
});
test('reposts keep real original authors, remain unique and never expose private or removed originals',async()=>{
 const f=await createSocialFixture();try{
 const first=(await api(f,'put','/api/publishing/reposts/public-post','c').send({comment:'Isolated own comment'}).expect(200)).body;
 await api(f,'put','/api/publishing/reposts/public-post','c').send({comment:'Edited own comment'}).expect(200);assert.equal(f.state.reposts.length,1);
 let rows=(await api(f,'get','/api/publishing/reposts?owner=c').expect(200)).body;assert.equal(rows.data[0].original.author.id,'a');assert.equal(rows.data[0].author.id,'c');assert.equal(rows.data[0].comment,'Edited own comment');assert.equal(f.state.notifications.filter(row=>row.tipo==='REPOST').length,1);
 f.user('a').perfilPrivado=true;rows=(await api(f,'get','/api/publishing/reposts?owner=c','b').expect(200)).body;assert.equal(rows.data[0].original,null);
 f.state.reposts[0].problemaId=null;rows=(await api(f,'get','/api/publishing/reposts?owner=c').expect(200)).body;assert.equal(rows.data[0].original,null);assert.equal(rows.data[0].comment,'Edited own comment');
 await api(f,'delete','/api/publishing/reposts/'+first.id,'a').expect(404);await api(f,'delete','/api/publishing/reposts/'+first.id,'c').expect(204);assert.equal(f.state.problems.length,2);
 }finally{await f.close();}
});
