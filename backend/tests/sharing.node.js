import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {createSocialFixture}from './helpers/socialFixture.js';
import {publicShare}from '../src/services/sharing.js';
test('public previews escape user content, preserve the application base path and expose only public metadata',async()=>{
 const f=await createSocialFixture();try{
  f.state.problems.find(row=>row.id==='public-post').titulo='<script>test</script>';
  f.state.images.push({id:'public-image',problemaId:'public-post',url:'/uploads/reports/a/public.png',tipo:'ANTES'});
  const metadata=(await request(f.app).get('/api/shares/public-post').expect(200)).body;
  assert.ok(metadata.url.endsWith('/share/problem/public-post'));assert.ok(metadata.appUrl.includes('/tecti/2026/gpec03/problem/public-post'));assert.equal(metadata.html,undefined);assert.equal(metadata.usuarioId,undefined);
  const page=await request(f.app).get('/share/problem/public-post?lang=en').expect(200);
  const english=(await request(f.app).get('/api/shares/public-post?lang=en').expect(200)).body;assert.ok(english.url.endsWith('?lang=en'));
  assert.match(page.text,/og:title/);assert.match(page.text,/og:image/);assert.doesNotMatch(page.text,/<script>test<\/script>/);assert.match(page.text,/&lt;script&gt;/);
  assert.doesNotMatch(page.text,/uploads\/reports|access=/);
  await request(f.app).get('/api/shares/public-post/image/public-image').expect(200);
  f.user('a').perfilPrivado=true;
  await request(f.app).get('/share/problem/public-post').expect(404);await request(f.app).get('/api/shares/public-post/image/public-image').expect(404);
 }finally{await f.close();}
});
test('private posts cannot be shared by their owner or an administrator and media cannot be borrowed from another post',async()=>{
 const f=await createSocialFixture();try{
  await request(f.app).get('/api/shares/private-post').set('Authorization','Bearer test-b').expect(404);
  f.user('a').admin={nivel:'ADMIN'};await request(f.app).get('/api/shares/private-post').set('Authorization','Bearer test-a').expect(404);
  await request(f.app).get('/api/shares/public-post/image/private-image').expect(404);
  await assert.rejects(publicShare(f.db,'public-post',{apiOrigin:'https://user:password@invalid.example',frontendUrl:'https://example.test/'}),{code:'shareUnavailable'});
 }finally{await f.close();}
});
