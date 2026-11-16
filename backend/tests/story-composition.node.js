import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {generateKeyPairSync} from 'node:crypto';
import jwt from 'jsonwebtoken';
import {createSocialFixture} from './helpers/socialFixture.js';
import {createMediaProviders} from '../src/services/mediaProviders.js';
import {validateComposition,safeStoryLink} from '../src/services/storyComposition.js';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
const element=(type,extra={})=>({id:'sticker',type,x:.5,y:.5,width:.6,rotation:0,opacity:1,text:'Question',color:'#ffffff',size:64,font:'Modern',align:'center',fill:null,...extra});
const composition=elements=>({version:1,effect:'normal',intensity:1,elements});
const api=(f,method,path,user='a')=>request(f.app)[method](path).set('Authorization','Bearer test-'+user);
test('composition rejects script links, unsupported documents, unbounded layers and forged media paths',()=>{
 for(const url of ['javascript:alert(1)','data:text/html,bad','http://example.com','https://user:pass@example.com'])assert.throws(()=>safeStoryLink(url),/storyCompositionInvalid/);
 assert.equal(safeStoryLink('https://example.com/path'),'https://example.com/path');
 assert.throws(()=>validateComposition(composition([element('text',{x:Infinity})])));
 assert.throws(()=>validateComposition(composition(Array.from({length:31},()=>element('text')))));
 assert.throws(()=>validateComposition(composition([element('video',{url:'https://evil.example/'})])));
 assert.throws(()=>validateComposition(composition([element('poll',{options:['same','same']})])));
 assert.throws(()=>validateComposition(composition([element('giphy',{giphyId:'../../bad'})])));
 const value=validateComposition(composition([element('giphy',{giphyId:'abc123',url:'https://evil.example/',secret:'never'})]));assert.equal(value.elements[0].url,undefined);assert.equal(value.elements[0].secret,undefined);
});
test('publishing retries reuse the same persisted story and conflict with a changed document',async()=>{
 const f=await createSocialFixture();try{
 const publish=doc=>api(f,'post','/api/stories').field('audience','PUBLICO').field('publicationKey','isolated-publication-key').field('composition',JSON.stringify(doc)).attach('file',png,{filename:'story.png',contentType:'image/png'});
 const doc=composition([element('link',{url:'https://example.com/'})]);const first=(await publish(doc).expect(201)).body;
 const second=(await publish(doc).expect(200)).body;assert.equal(second.id,first.id);assert.equal(f.state.stories.length,1);assert.equal(f.storedStoryMedia.size,1);assert.equal(second.composition.elements[0].url,'https://example.com/');
 await publish(composition([element('text')])).expect(409);assert.equal(f.state.stories.length,1);
 }finally{await f.close();}
});
test('sticker votes are unique per user, owner results are private and access expires',async()=>{
 const f=await createSocialFixture();try{
 const story=(await api(f,'post','/api/stories').field('audience','PUBLICO').field('composition',JSON.stringify(composition([element('poll',{options:['A','B']})]))).attach('file',png,{filename:'story.png',contentType:'image/png'}).expect(201)).body;
 const path='/api/stories/'+story.id+'/elements/sticker';
 await api(f,'put',path+'/answer','a').send({value:0}).expect(403);
 await api(f,'put',path+'/answer','c').send({value:5}).expect(400);
 await Promise.all(Array.from({length:3},()=>api(f,'put',path+'/answer','c').send({value:1}).expect(200)));assert.equal(f.state.storyAnswers.length,1);
 await api(f,'put',path+'/answer','c').send({value:0}).expect(200);assert.equal(f.state.storyAnswers[0].valor,1);
 const own=(await api(f,'get',path+'/answers','c').expect(200)).body;assert.deepEqual(own,{own:1});
 const owner=(await api(f,'get',path+'/answers','a').expect(200)).body;assert.equal(owner.total,1);assert.equal(owner.data[0].user.id,'c');
 f.user('a').perfilPrivado=true;await api(f,'get',path+'/answers','c').expect(404);await api(f,'put',path+'/answer','c').send({value:0}).expect(404);
 f.state.stories[0].expiraEm=new Date(Date.now()-1);await api(f,'get',path+'/answers','a').expect(404);
 }finally{await f.close();}
});
test('Apple provider signs ES256 tokens, restricts origins, normalizes references and handles failures',async()=>{
 const unavailable=createMediaProviders({env:{}});assert.equal(unavailable.status().apple.configured,false);await assert.rejects(()=>unavailable.search({q:'music'}),/mediaProviderNotConfigured/);
 const {privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'}),env={APPLE_MUSIC_TEAM_ID:'TESTTEAM01',APPLE_MUSIC_KEY_ID:'TESTKEY001',APPLE_MUSIC_PRIVATE_KEY:privateKey.export({type:'pkcs8',format:'pem'}),FRONTEND_URL:'https://voz.example/path'};
 const calls=[];const provider=createMediaProviders({env,fetcher:async(url,options)=>{calls.push(url);jwt.verify(options.headers.Authorization.slice(7),publicKey,{algorithms:['ES256']});return{ok:true,json:async()=>({results:{songs:{data:[{id:'123',type:'songs',attributes:{name:'Isolated test',artistName:'Test only',url:'https://music.apple.com/br/song/123',previews:[{url:'must-not-be-returned'}]}}]}}})};}});
 assert.throws(()=>provider.clientToken('https://evil.example'),/mediaProviderUnavailable/);
 const token=provider.clientToken('https://voz.example').developerToken;assert.deepEqual(jwt.verify(token,publicKey,{algorithms:['ES256']}).origin,['https://voz.example']);
 const result=await provider.search({q:'a b',type:'songs'});assert.equal(result.data[0].preview,undefined);assert.equal(result.data[0].audio,undefined);assert.match(calls[0],/term=a\+b/);
 const limited=createMediaProviders({env,fetcher:async()=>({ok:false,status:429})});await assert.rejects(()=>limited.search({q:'x'}),error=>error.status===429);
});
test('questions, sliders, countdowns and mentions persist real actors and respect preferences',async()=>{
 const f=await createSocialFixture();try{
 const publish=(elements,audience='PUBLICO')=>api(f,'post','/api/stories').field('audience',audience).field('composition',JSON.stringify(composition(elements))).attach('file',png,{filename:'story.png',contentType:'image/png'});
 const story=(await publish([element('question',{id:'question'}),element('slider',{id:'slider',emoji:'heart'}),element('countdown',{id:'countdown',endsAt:new Date(Date.now()+3600000).toISOString()}),element('mention',{id:'mention',userId:'c',text:'forged name'})]).expect(201)).body;
 assert.equal(story.composition.elements[3].text,'@person.c');assert.equal(f.state.notifications.length,1);assert.equal(f.state.notifications[0].autorId,'a');assert.equal(f.state.notifications[0].usuarioId,'c');
 for(const [id,value] of [['question','An isolated response'],['slider',73],['countdown',true]]){
  const path='/api/stories/'+story.id+'/elements/'+id;
  await api(f,'put',path+'/answer','c').send({value}).expect(200);
  const result=(await api(f,'get',path+'/answers','a').expect(200)).body;assert.equal(result.total,1);assert.equal(result.data[0].value,value);
 }
 await publish([element('mention',{userId:'b'})]).expect(400);
 f.state.notificationPreferences.push({usuarioId:'c',tipo:'MENCAO',ativa:false});await publish([element('mention',{userId:'c'})]).expect(201);assert.equal(f.state.notifications.length,1);
 }finally{await f.close();}
});
