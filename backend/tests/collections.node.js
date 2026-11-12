import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createSocialFixture } from './helpers/socialFixture.js';
const call=(f,method,path,actor='a')=>{const req=request(f.app)[method]('/api/collections'+path);return actor?req.set('Authorization','Bearer test-'+actor):req;};

test('collections preserve saved records, enforce ownership, validate input and keep membership unique',async()=>{
 const f=await createSocialFixture();try{
 await call(f,'post','',null).send({name:'No'}).expect(401);
 for(const body of [{name:''},{name:'x'.repeat(81)},{name:'Test',private:'false'}])await call(f,'post','').send(body).expect(400);
 const created=(await call(f,'post','').send({name:'Roads'}).expect(201)).body;assert.equal(created.private,true);
 await call(f,'get','/'+created.id,'b').expect(404);
 await call(f,'patch','/'+created.id,'b').send({name:'Stolen'}).expect(404);
 await call(f,'delete','/'+created.id,'b').expect(404);
 await Promise.all(Array.from({length:5},()=>call(f,'put','/'+created.id+'/items/public-post').expect(204)));
 assert.equal(f.state.saved.filter(s=>s.problemaId==='public-post'&&s.usuarioId==='a').length,1);assert.equal(f.state.collectionItems.length,1);
 const list=(await call(f,'get','/'+created.id).expect(200)).body;assert.equal(list.total,1);assert.equal(list.data[0].id,'public-post');
 await call(f,'delete','/'+created.id+'/items/public-post').expect(204);assert.equal(f.state.saved.filter(s=>s.problemaId==='public-post').length,1);
 await call(f,'patch','/'+created.id).send({name:'Renamed',private:false}).expect(200);
 assert.equal((await call(f,'get','/public/a',null).expect(200)).body.data[0].name,'Renamed');
 await call(f,'put','/'+created.id+'/items/public-post').expect(204);await call(f,'delete','/'+created.id).expect(204);
 assert.equal(f.state.collectionItems.length,0);assert.equal(f.state.saved.filter(s=>s.problemaId==='public-post').length,1);
 }finally{await f.close();}
});

test('public collections never reveal inaccessible original posts or private profile collections',async()=>{
 const f=await createSocialFixture();try{
 const created=(await call(f,'post','').send({name:'Visible',private:false}).expect(201)).body;
 await call(f,'put','/'+created.id+'/items/private-post').expect(404);
 await call(f,'put','/'+created.id+'/items/public-post').expect(204);
 assert.equal((await call(f,'get','/'+created.id,null).expect(200)).body.total,1);
 f.user('a').perfilPrivado=true;
 await call(f,'get','/'+created.id,null).expect(404);await call(f,'get','/public/a','b').expect(404);
 f.user('a').perfilPrivado=false;
 const secret=(await call(f,'post','','b').send({name:'Private',private:false}).expect(201)).body;
 await call(f,'put','/'+secret.id+'/items/private-post','b').expect(204);
 f.user('b').perfilPrivado=false;
 assert.equal((await call(f,'get','/'+secret.id,null).expect(200)).body.total,1);
 f.user('b').perfilPrivado=true;
 await call(f,'get','/'+secret.id,null).expect(404);
 // A public collection can reference a saved private post, but readers still need post access.
 f.state.collectionItems.push({id:'inaccessible',colecaoId:created.id,salvoId:'saved-1',criadaEm:new Date()});
 const visible=(await call(f,'get','/'+created.id,null).expect(200)).body;assert.equal(visible.total,1);assert.deepEqual(visible.data.map(p=>p.id),['public-post']);
 }finally{await f.close();}
});
