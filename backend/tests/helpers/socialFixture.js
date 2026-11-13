import * as sharingService from '../../src/services/sharing.js';
import * as profileFeatures from '../../src/services/profileFeatures.js';
import {validateMedia} from '../../src/utils/mediaValidation.js';
import * as trackingService from '../../src/services/problemTracking.js';
import * as workflowService from '../../src/services/workflow.js';
import * as comparisonService from '../../src/services/comparisons.js';
import * as geographyService from '../../src/services/geography.js';
import { createAchievements } from '../../src/services/achievements.js';
import * as problemStatusService from '../../src/services/problemStatus.js';
import * as watchingService from '../../src/services/watching.js';
import * as voteService from '../../src/services/votes.js';
import * as commentService from '../../src/services/comments.js';
import * as notificationService from '../../src/services/notifications.js';
import * as activityEvents from '../../src/services/activityEvents.js';
import * as pollService from '../../src/services/polls.js';
import { Readable } from 'node:stream';
import rateLimit from 'express-rate-limit';
import * as storyService from '../../src/services/stories.js';
import * as storyMedia from '../../src/services/storyMedia.js';
import * as collectionService from '../../src/services/collections.js';
import * as savedSerialization from '../../src/services/savedPublications.js';
import express from 'express';
import multer from 'multer';
import vm from 'node:vm';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as graph from '../../src/services/socialGraph.js';
import * as messaging from '../../src/services/messaging.js';
import * as errors from '../../src/middlewares/errorHandler.js';
import * as media from '../../src/services/publicationMedia.js';
import { createSocialMemory } from './socialMemory.js';

export const TEST_SECRET = 'social-fixture-only-never-production';
export async function createSocialFixture({ streaming = false } = {}) {
  process.env.JWT_SECRET = TEST_SECRET;
  const memory = createSocialMemory();
  const {db,state,user} = memory;
  user('b').perfilPrivado = true;
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'voz-social-test-'));
  const imageDirectory=path.join(root,'reports','b');fs.mkdirSync(imageDirectory,{recursive:true});
  const imagePath=path.join(imageDirectory,'pixel.png');
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');fs.writeFileSync(imagePath,png);
  const image={id:'private-image',url:'/uploads/reports/b/pixel.png',problemaId:'private-post'};
  state.images.push(image);
  state.problems.push(
    {id:'private-post',usuarioId:'b',titulo:'Conteúdo privado preservado',descricao:'Descrição privada',status:'ABERTO',dataCriacao:new Date(),imagens:[image]},
    {id:'public-post',usuarioId:'a',titulo:'Conteúdo público preservado',descricao:'Descrição pública',status:'ABERTO',dataCriacao:new Date(),imagens:[]},
  );
  state.comments.push({id:'comment-1',usuarioId:'b',problemaId:'private-post',texto:'Comentário privado',dataCriacao:new Date()});
  state.saved.push({id:'saved-1',usuarioId:'a',problemaId:'private-post',criadaEm:new Date()});
  state.votes.push({id:'vote-1',usuarioId:'a',problemaId:'private-post'});
  const authenticate=(required)=>(req,res,next)=>{
    const id=req.headers.authorization?.match(/^Bearer test-([abc])$/)?.[1];
    const actor=user(id);if(actor){req.userId=actor.id;req.isAdmin=Boolean(actor.admin);req.userRole=actor.admin?'admin':'usuario';}
    if(required&&!actor)return res.status(401).json({error:'login'});next();
  };
  const announceNotification=async notification=>{if(notification)activityEvents.publishActivity(notification.usuarioId,notification.tipo);};
  const notify=async data=>{const row=await notificationService.writeNotification(db,data);await announceNotification(row);return row;};
  const search=()=>async(req,res)=>{const term=String(req.query.q||'').toLowerCase();const rows=state.users.filter(u=>[u.nome,u.username].some(v=>v.toLowerCase().includes(term)));res.json({data:rows.map(({id,nome,username,fotoPerfil})=>({id,nome,username,fotoPerfil})),total:rows.length,page:1,limit:12});};
  const storedStoryMedia = new Map();
  const storage={readStoredPublication:async()=>({buffer:png,contentType:'image/png'}),storeFile:async()=>{throw Error('test upload not enabled');},removeStoredFile:async()=>{},removeOwnedStoredFile:async()=>false,storeFiles:async()=>[],removeStoredFiles:async()=>{}};
  storage.storeStoryFile = async (file,ownerId) => { const url='/uploads/posts/'+ownerId+'/story-'+storedStoryMedia.size;storedStoryMedia.set(url,file);return{url,path:url}; };
  storage.removeStoredFiles = async urls => { for(const url of urls)storedStoryMedia.delete(url); };
  storage.streamStoredMedia = async url => { const file=storedStoryMedia.get(url);if(!file)throw Object.assign(new Error('storyUnavailable'),{status:404});return{stream:Readable.from(file.buffer),status:200,headers:{'Content-Length':String(file.buffer.length)}}; };
  storage.storeFiles=async(files,bucket,ownerId)=>{for(const file of files||[])validateMedia(file);return (files||[]).map((file,index)=>({url:'/uploads/'+bucket+'/'+ownerId+'/fixture-'+storedStoryMedia.size+'-'+index+'.png'}));};
  storage.storeFile=async(file,bucket,ownerId)=>(await storage.storeFiles([file],bucket,ownerId))[0];
  const achievementChecks=[];
  const achievements={achievementService:createAchievements(db),queueAchievementCheck:id=>achievementChecks.push(id)};
  const dependencies={
    '../services/sharing.js':sharingService,'../services/profileFeatures.js':profileFeatures,'../services/problemTracking.js':trackingService,'../services/workflow.js':workflowService,'../services/comparisons.js':comparisonService,'../services/geography.js':geographyService,express:{default:express},'node:path':{default:path},'../config/prisma.js':{prisma:db},'./prisma.js':{prisma:db},'../services/problemStatus.js':problemStatusService,
    '../services/votes.js':voteService,'../services/comments.js':commentService,'../services/achievementQueue.js':achievements,'../services/watching.js':watchingService,'../services/notifications.js':notificationService,'../services/activityEvents.js':activityEvents,'../services/polls.js':pollService,'../services/stories.js':storyService,'../services/storyMedia.js':storyMedia,'express-rate-limit':{default:rateLimit},multer:{default:multer},'../services/collections.js':collectionService,'../services/savedPublications.js':savedSerialization,'../services/socialGraph.js':graph,'../services/messaging.js':messaging,
    '../services/publicationMedia.js':media,'../middlewares/errorHandler.js':errors,
    '../middlewares/auth.js':{authMiddleware:authenticate(true),optionalAuthMiddleware:authenticate(false),adminMiddleware:(req,res,next)=>req.isAdmin?next():res.status(403).json({error:'admin'})},
    '../utils/notifications.js':{createNotification:notify,announceNotification,notifyProblemOwner:async data=>notify({...data,usuarioId:data.problem.usuarioId})},
    '../services/peopleSearch.js':{createPeopleSearch:search},
    '../middleware/memoryUpload.js':{memoryImageUpload:()=>multer({storage:multer.memoryStorage()})},
    '../config/storage.js':storage,'./uploads.js':{uploadsRoot:root},jsonwebtoken:{default:(await import('jsonwebtoken')).default},
  };
  async function load(relative){
    const source=fs.readFileSync(new URL('../../src/'+relative,import.meta.url),'utf8');
    const context=vm.createContext({console,Buffer,process:{env:{JWT_SECRET:TEST_SECRET,NODE_ENV:'test'}},setTimeout,clearTimeout,setInterval,clearInterval,URL});
    const module=new vm.SourceTextModule(source,{context});
    await module.link(async name=>{
      const values=dependencies[name];if(!values)throw Error('Unexpected fixture dependency '+name);
      return new vm.SyntheticModule(Object.keys(values),function(){for(const [key,value]of Object.entries(values))this.setExport(key,value);},{context});
    });
    await module.evaluate();return module.namespace;
  }
  const app=express();app.use(express.json());
  app.use('/api', (req,res,next)=>{res.set('Cache-Control','private, no-store');next();});
  const social=await load('routes/social.js');
  app.use('/api/social',social.publicSocialRouter);
  app.use('/api/social',authenticate(true),social.default);
  app.use('/api/conversations',authenticate(true),(await load('routes/conversations.js')).default);
  app.use('/api/users',authenticate(true),(await load('routes/users.js')).default);
  app.use('/api/admin',authenticate(true),(req,res,next)=>req.isAdmin?next():res.status(403).json({error:'admin'}),(await load('routes/admin.js')).default);
  app.use('/api/problems',(await load('routes/problems.js')).default);
  app.use('/api/comments',(await load('routes/comments.js')).default);
  app.use('/api/votes',authenticate(true),(await load('routes/votes.js')).default);
  app.use('/api/profile-features',(await load('routes/profileFeatures.js')).default);
  const sharing=await load('routes/sharing.js');app.use('/api/shares',sharing.default);app.use('/share',sharing.publicShareRouter);
  app.use('/api/tracking',(await load('routes/tracking.js')).default);
  app.use('/api/geography',(await load('routes/geography.js')).default);
  app.use('/api/participation',(await load('routes/participation.js')).default);
  app.use('/api/polls',(await load('routes/polls.js')).default);
  app.use('/api/stories',(await load('routes/stories.js')).default);
  app.use('/api/collections',(await load('routes/collections.js')).default);
  app.use('/api/saved',(await load('routes/saved.js')).default);
  app.use('/api/media',(await load('routes/media.js')).default);
  app.use('/uploads',(await load('config/media.js')).uploadedMedia);
  app.get('/api/categories',(req,res)=>res.json([{id:'cat',name:'Iluminação',color:'#a855f7'}]));
  if(!streaming)app.get('/api/notifications/stream',authenticate(true),(req,res)=>res.type('text/event-stream').send('retry: 60000\nevent: ready\ndata: {}\n\n'));
  app.use('/api/notifications',(await load('routes/notifications.js')).default);
  app.post('/api/visits',(req,res)=>res.json({ok:true}));
  app.use(errors.errorHandler);
  return {app,...memory,storedStoryMedia,achievementChecks,close(){
    if(!path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep)||!path.basename(root).startsWith('voz-social-test-'))throw Error('Unsafe fixture cleanup');
    fs.unlinkSync(imagePath);fs.rmdirSync(imageDirectory);fs.rmdirSync(path.dirname(imageDirectory));fs.rmdirSync(root);
  }};
}
