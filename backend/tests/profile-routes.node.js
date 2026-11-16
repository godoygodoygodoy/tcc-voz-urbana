import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import request from 'supertest';
import { createSocialFixture } from './helpers/socialFixture.js';
import { inspectSchema } from '../src/services/schemaCompatibility.js';
import { releaseInfo, API_CONTRACT } from '../src/config/release.js';

test('profile requests match mounted API paths and real route handlers for owners and other users',async()=>{
  const f=await createSocialFixture();
  try{
    const paths=['/users/me','/social/users/a/profile','/social/users/username/person.a/profile',
      '/social/users/a/followers','/social/users/a/following','/social/users/c/common-connections',
      '/social/users/c/common-connections?direction=followers&page=1','/social/users/c/relationship',
      '/profile-features/a/stats','/profile-features/c/stats','/participation/users/a/achievements',
      '/participation/users/c/achievements','/profile-features/me/presentation','/notifications',
      '/notifications?paginated=true&page=1','/notifications/preferences','/social/follow-requests/received',
      '/social/follow-requests/sent','/stories?owner=a','/collections','/collections/public/c'];
    for(const path of paths){const response=await request(f.app).get('/api'+path).set('Authorization','Bearer test-a');assert.equal(response.status,200,path);assert.notEqual(response.body.code,'API_ROUTE_NOT_FOUND',path);}
    const own=await request(f.app).get('/api/social/users/a/profile').set('Authorization','Bearer test-a');assert.equal(own.body.id,'a');
    const other=await request(f.app).get('/api/social/users/c/profile').set('Authorization','Bearer test-a');assert.equal(other.body.id,'c');
    await request(f.app).get('/api/social/users/b/common-connections').set('Authorization','Bearer test-a').expect(403);
    for(const path of ['/profile-features/b/stats','/participation/users/b/achievements']){const response=await request(f.app).get('/api'+path).set('Authorization','Bearer test-a').expect(404);assert.equal(response.body.error,'profileNotFound');assert.equal(response.body.code,undefined);}
    const missing=await request(f.app).get('/api/does-not-exist').expect(404);assert.equal(missing.body.code,'API_ROUTE_NOT_FOUND');
    const absent=await request(f.app).get('/api/profile-features/missing/stats').set('Authorization','Bearer test-a').expect(404);assert.notEqual(absent.body.code,'API_ROUTE_NOT_FOUND');
  }finally{await f.close();}
});

test('SSE is registered before fallback and accepts only authenticated users',async()=>{
  const f=await createSocialFixture({streaming:true});const server=f.app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  try{
    await request(f.app).get('/api/notifications/stream').expect(401);
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),3000);
    try{const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/notifications/stream',{headers:{Authorization:'Bearer test-a'},signal:controller.signal});assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/text\/event-stream/);const reader=response.body.getReader();const first=await reader.read();assert.match(new TextDecoder().decode(first.value),/event: ready/);await reader.cancel();}finally{clearTimeout(timer);controller.abort();}
  }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await f.close();}
});

test('the production server mounts every profile module before notFound and preserves protected social routes',()=>{
  const server=fs.readFileSync(new URL('../src/server.js',import.meta.url),'utf8');
  for(const [prefix,router]of [['/api/users','userRoutes'],['/api/social','publicSocialRouter'],['/api/notifications','notificationRoutes'],['/api/participation','participationRoutes'],['/api/profile-features','profileFeatureRoutes']]){
    const mount=new RegExp('app\\.use\\([\'\"]'+prefix+'[\'\"],([^;]*)'+router+'\\)');assert.match(server,mount);assert.ok(server.search(mount)<server.indexOf('app.use(notFound)'));
  }
  assert.match(server,/app\.use\("\/api\/social", authMiddleware, socialRoutes\)/);
  assert.ok(server.indexOf('await assertSchemaReady(prisma)')<server.indexOf('server = app.listen'));
});

test('schema diagnostics map database names, ignore relations and do not write; release identity exposes no secrets',async()=>{
  const calls=[],db={$queryRaw:async(strings)=>{calls.push(strings.join('?'));return[{TABLE_NAME:'people',COLUMN_NAME:'id'},{TABLE_NAME:'people',COLUMN_NAME:'display_name'}];}};
  const model={name:'Person',dbName:'people',fields:[{name:'id',kind:'scalar'},{name:'name',dbName:'display_name',kind:'scalar'},{name:'friends',kind:'object'}]};
  assert.equal((await inspectSchema(db,[model])).compatible,true);
  const missing=await inspectSchema(db,[{...model,fields:[...model.fields,{name:'private',dbName:'is_private',kind:'scalar'}]}]);assert.equal(missing.compatible,false);assert.deepEqual(missing.missing,[{table:'people',columns:['is_private']}]);assert.ok(calls.every(sql=>/^SELECT/i.test(sql)));
  const info=releaseInfo({RENDER_GIT_COMMIT:'a'.repeat(40),JWT_SECRET:'never-expose'});assert.deepEqual(info,{revision:'a'.repeat(40),apiContract:API_CONTRACT});assert.equal(releaseInfo({RENDER_GIT_COMMIT:'invalid'}).revision,null);
});
