import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {createSocialFixture} from './helpers/socialFixture.js';
const get=(f,path,user)=>{const req=request(f.app).get(path);return user?req.set('Authorization','Bearer test-'+user):req;};
test('Radar merges actual updates and reports, preserves private access and paginates without duplicate events',async()=>{
 const f=await createSocialFixture();try{
 f.state.problems[1].latitude=-23;f.state.problems[1].longitude=-46;
 const time=new Date('2026-11-15T12:00:00Z');f.state.problems.forEach(post=>post.dataCriacao=time);
 for(let i=0;i<18;i++)f.state.statusHistory.push({id:'update-'+String(i).padStart(2,'0'),problemaId:'public-post',usuarioId:'a',texto:'Actual isolated history '+i,dataCriacao:time,status:'EM_ANDAMENTO'});
 f.state.statusHistory.push({id:'private-update',problemaId:'private-post',usuarioId:'b',texto:'Private history',dataCriacao:time});
 const first=(await get(f,'/api/radar').expect(200)).body;assert.equal(first.data.length,12);assert.equal(first.hasMore,true);assert.equal(first.markers.length,1);assert.equal(first.data.some(row=>row.sourceId==='private-update'),false);
 const second=(await get(f,'/api/radar?cursor='+encodeURIComponent(first.nextCursor)).expect(200)).body;assert.equal(second.data.length,7);assert.equal(second.hasMore,false);assert.equal(new Set([...first.data,...second.data].map(row=>row.id)).size,19);
 await get(f,'/api/radar?type=reports&cursor='+encodeURIComponent(first.nextCursor)).expect(400);
 const blocked=await request(f.app).put('/api/social-safety/users/a/block').set('Authorization','Bearer test-c').send({enabled:true}).expect(200);assert.ok(blocked.body.enabled);
 assert.equal((await get(f,'/api/radar','c').expect(200)).body.data.length,0);
 }finally{await f.close();}
});
test('Radar date filters apply to update dates, and malformed cursor/date input is rejected',async()=>{
 const f=await createSocialFixture();try{
 f.state.problems[1].dataCriacao=new Date('2025-01-01');f.state.statusHistory.push({id:'recent-update',problemaId:'public-post',usuarioId:'a',texto:'A later change',dataCriacao:new Date('2026-11-15T12:00:00Z')});
 const result=(await get(f,'/api/radar?from=2026-11-01&to=2026-11-16').expect(200)).body;assert.equal(result.data.length,1);assert.equal(result.data[0].type,'update');
 await get(f,'/api/radar?from=2026-99-01').expect(400);await get(f,'/api/radar?cursor=bad').expect(400);
 }finally{await f.close();}
});
