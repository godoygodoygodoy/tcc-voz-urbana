import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {createSocialFixture} from './helpers/socialFixture.js';
import {createStories} from '../src/services/stories.js';
test('viewers belong to the owner, resolve current identities and expire with the story',async()=>{
 const f=await createSocialFixture();try{
  const service=createStories(f.db),story=await service.publish('a',{url:'/uploads/posts/a/test.png',mime:'image/png',audience:'PUBLICO'});
  await service.view('c',story.id);f.user('c').nome='Updated viewer';
  const url='/api/stories/'+story.id+'/viewers';
  await request(f.app).get(url).expect(401);
  await request(f.app).get(url).set('Authorization','Bearer test-c').expect(403);
  const response=await request(f.app).get(url).set('Authorization','Bearer test-a').expect(200);
  assert.equal(response.body.total,1);assert.equal(response.body.data[0].user.nome,'Updated viewer');assert.equal(response.body.data[0].user.id,'c');assert.equal('email' in response.body.data[0].user,false);
  assert.equal((await service.list('c',{scope:'following'})).total,0);
  f.state.follows.push({id:'following',followerId:'c',followingId:'a',status:'ACEITA'});
  assert.equal((await service.list('c',{scope:'following'})).total,1);
  f.state.stories[0].expiraEm=new Date(Date.now()-1);
  await request(f.app).get(url).set('Authorization','Bearer test-a').expect(404);
 }finally{f.close();}
});
