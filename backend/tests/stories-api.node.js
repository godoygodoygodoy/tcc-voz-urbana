import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createSocialFixture } from './helpers/socialFixture.js';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
const api=(f,method,url,actor)=>{const req=request(f.app)[method](url);return actor?req.set('Authorization','Bearer test-'+actor):req;};
const publish=(f,actor,audience)=>api(f,'post','/api/stories',actor).field('audience',audience).attach('file',png,{filename:'story.png',contentType:'image/png'});
test('story HTTP endpoints protect uploads, bind media tickets, recheck privacy and keep views unique',async()=>{
 const f=await createSocialFixture();try{
 await api(f,'get','/api/stories').expect(401);
 const created=(await publish(f,'a','PUBLICO').expect(201)).body;assert.equal(f.storedStoryMedia.size,1);assert.match(created.mediaUrl,/access=/);
 const listed=(await api(f,'get','/api/stories','c').expect(200)).body;assert.equal(listed.total,1);
 const media=listed.data[0].mediaUrl;const file=await api(f,'get',media).expect(200);assert.match(file.headers['content-type'],/image\/png/);assert.match(file.headers['cache-control'],/no-store/);
 await api(f,'get',media.replace(created.id,'not-this-story')).expect(404);
 await Promise.all(Array.from({length:5},()=>api(f,'post','/api/stories/'+created.id+'/view','c').expect(200)));assert.equal(f.state.storyViews.length,1);
 f.user('a').perfilPrivado=true;await api(f,'get',media).expect(404);
 const followers=(await publish(f,'b','SEGUIDORES').expect(201)).body;assert.equal((await api(f,'get','/api/stories','a').expect(200)).body.data.some(s=>s.id===followers.id),false);
 await api(f,'delete','/api/stories/'+followers.id,'a').expect(404);
 await api(f,'delete','/api/stories/'+followers.id,'b').expect(204);await api(f,'get',followers.mediaUrl).expect(404);
 await api(f,'post','/api/stories','a').field('audience','PUBLICO').attach('file',Buffer.from('<svg onload="alert(1)">'),{filename:'fake.png',contentType:'image/png'}).expect(400);
 f.state.stories.find(s=>s.id===created.id).expiraEm=new Date(Date.now()-1);await api(f,'get',created.mediaUrl).expect(404);
 }finally{await f.close();}
});
