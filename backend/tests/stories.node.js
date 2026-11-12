import test from 'node:test';
import assert from 'node:assert/strict';
import { createSocialMemory } from './helpers/socialMemory.js';
import { createStories, cleanExpiredStories } from '../src/services/stories.js';
const create=(service,owner,audience='PUBLICO')=>service.publish(owner,{url:'/uploads/posts/'+owner+'/story.png',posterUrl:null,mime:'image/png',audience});
const edge=(f,from,to,status='ACEITA')=>f.state.follows.push({id:from+'-'+to,followerId:from,followingId:to,status});

test('stories enforce each audience, profile privacy, exact expiry and private ownership',async()=>{
 const f=createSocialMemory(),s=createStories(f.db);
 const publicStory=await create(s,'b');assert.equal((await s.list('a')).total,1);
 const followers=await create(s,'b','SEGUIDORES'),friends=await create(s,'b','AMIGOS'),self=await create(s,'b','SO_EU');
 assert.equal((await s.list('a')).total,1);await assert.rejects(s.get('a',followers.id),{status:404});await assert.rejects(s.get('a',self.id),{status:404});
 edge(f,'a','b','PENDENTE');assert.equal((await s.list('a')).total,1);f.state.follows[0].status='ACEITA';assert.equal((await s.list('a')).total,2);
 edge(f,'b','a');assert.equal((await s.list('a')).total,3);assert.equal((await s.list('b')).total,4);
 f.user('b').perfilPrivado=true;assert.equal((await s.list('c')).total,0);assert.equal((await s.list('a')).total,3);
 f.state.follows=[];assert.equal((await s.list('a')).total,0);
 f.user('b').perfilPrivado=false;f.state.stories.find(story=>story.id===publicStory.id).expiraEm=new Date(Date.now()-1);await assert.rejects(s.get('a',publicStory.id),{status:404});
 await assert.rejects(s.remove('a',friends.id),{status:404});await s.remove('b',friends.id);await assert.rejects(s.get('b',friends.id),{status:404});
});
test('views are idempotent per authenticated user and owners cannot inflate their own count',async()=>{
 const f=createSocialMemory(),s=createStories(f.db),story=await create(s,'b');
 await Promise.all(Array.from({length:10},()=>s.view('a',story.id)));assert.equal(f.state.storyViews.length,1);
 await s.view('b',story.id);assert.equal(f.state.storyViews.length,1);
 await s.view('c',story.id);assert.equal(f.state.storyViews.length,2);
 assert.equal((await s.list('b')).data[0].viewCount,2);assert.equal((await s.list('a')).data[0].viewed,true);assert.equal('viewCount' in (await s.list('a')).data[0],false);
});
test('story quota survives concurrent publishing and failed cleanup keeps references for retry',async()=>{
 const f=createSocialMemory(),s=createStories(f.db);const results=await Promise.allSettled(Array.from({length:25},()=>create(s,'a')));assert.equal(results.filter(r=>r.status==='fulfilled').length,20);assert.equal(f.state.stories.length,20);
 const story=f.state.stories[0];await s.remove('a',story.id);let attempts=0;
 await cleanExpiredStories(f.db,async()=>{attempts++;throw new Error('Offline');});assert.equal(attempts,1);assert.equal(f.state.stories.length,20);
 await cleanExpiredStories(f.db,async urls=>{assert.deepEqual(urls,[story.url]);});assert.equal(f.state.stories.length,19);
});
