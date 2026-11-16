import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import request from 'supertest';
import {createMediaVariants,imageVariant} from '../src/services/mediaVariants.js';
import {createSocialFixture} from './helpers/socialFixture.js';
test('WebP derivatives preserve originals, coalesce concurrent reads and bound cache entries',async()=>{
 const original=await sharp({create:{width:800,height:600,channels:3,background:'#7c3aed'}}).png().toBuffer(),copy=Buffer.from(original);
 let reads=0;const get=createMediaVariants(async()=>{reads++;return{buffer:original,contentType:'image/png'};},{maxEntries:1});
 const [a,b]=await Promise.all([get({id:'a',url:'/a.png'},480),get({id:'a',url:'/a.png'},480)]);
 assert.equal(reads,1);assert.equal(a,b);assert.equal(a.contentType,'image/webp');assert.deepEqual(original,copy);
 const meta=await sharp(a.buffer).metadata();assert.equal(meta.width,480);assert.equal(meta.height,360);
 await get({id:'b',url:'/b.png'},480);await get({id:'a',url:'/a.png'},480);assert.equal(reads,3);
 assert.throws(()=>imageVariant({width:99999,format:'webp'}));assert.throws(()=>imageVariant({width:480,format:'invalid'}));
});
test('conditional media reads reauthorize before 304 and cannot reuse a cached private image after revocation',async()=>{
 const f=await createSocialFixture();try{
  f.state.follows.push({id:'allowed',followerId:'a',followingId:'b',status:'ACEITA'});
  const profile=(await request(f.app).get('/api/social/users/b/profile').set('Authorization','Bearer test-a').expect(200)).body;
  const url=profile.publications[0].images[0].url;
  const first=await request(f.app).get(url).expect(200);assert.match(first.headers['cache-control'],/private/);assert.ok(first.headers.etag);
  await request(f.app).get(url).set('If-None-Match',first.headers.etag).expect(304);
  f.state.follows=[];await request(f.app).get(url).set('If-None-Match',first.headers.etag).expect(404);
 }finally{f.close();}
});
