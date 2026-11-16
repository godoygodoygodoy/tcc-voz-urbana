import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {createSocialFixture} from './helpers/socialFixture.js';
const api=(f,method,path,user='a')=>request(f.app)[method](path).set('Authorization','Bearer test-'+user);
test('close friends membership is owner-managed, revocable and never bypasses private profile or block',async()=>{
 const f=await createSocialFixture();try{
  await api(f,'put','/api/social-safety/close-friends/a').send({enabled:true}).expect(400);
  await api(f,'put','/api/social-safety/close-friends/c').send({enabled:true}).expect(200);
  await api(f,'put','/api/social-safety/close-friends/c').send({enabled:true}).expect(200);
  assert.equal(f.state.closeFriends.length,1);
  assert.equal((await api(f,'get','/api/social-safety/close-friends').expect(200)).body.total,1);
  assert.equal((await api(f,'get','/api/social-safety/close-friends','c').expect(200)).body.total,0);
  await api(f,'put','/api/publishing/notes/me').send({text:'Close circle only',audience:'PROXIMOS',hours:1}).expect(200);
  const notes=async user=>(await api(f,'get','/api/publishing/notes?owner=a',user).expect(200)).body.total;
  assert.equal(await notes('c'),1);assert.equal(await notes('b'),0);
  f.user('a').perfilPrivado=true;assert.equal(await notes('c'),0);
  f.state.follows.push({id:'close-follow',followerId:'c',followingId:'a',status:'ACEITA'});
  assert.equal(await notes('c'),1);
  await api(f,'put','/api/social-safety/close-friends/c').send({enabled:false}).expect(200);
  assert.equal(await notes('c'),0);
  await api(f,'put','/api/social-safety/close-friends/c').send({enabled:true}).expect(200);
  await api(f,'put','/api/social-safety/users/c/block').send({enabled:true}).expect(200);
  assert.equal(f.state.closeFriends.length,0);assert.equal(await notes('c'),0);
  await api(f,'put','/api/social-safety/users/c/block').send({enabled:false}).expect(200);
  assert.equal(await notes('c'),0);
 }finally{await f.close();}
});
