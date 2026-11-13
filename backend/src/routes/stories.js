import { writeNotification } from '../services/notifications.js';
import { announceNotification } from '../utils/notifications.js';
﻿import express from 'express';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { prisma } from '../config/prisma.js';
import { authMiddleware, optionalAuthMiddleware } from '../middlewares/auth.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { storeStoryFile, removeStoredFiles, streamStoredMedia } from '../config/storage.js';
import { prepareStoryMedia } from '../services/storyMedia.js';
import { createStories, cleanExpiredStories, serializeStory, STORY_AUDIENCES } from '../services/stories.js';
import { socialError } from '../services/socialGraph.js';
const router=express.Router(),stories=createStories(prisma,{notify:writeNotification});
const upload=multer({storage:multer.memoryStorage(),limits:{files:1,fileSize:20*1024*1024,fields:2},fileFilter:(req,file,callback)=>callback(null,['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm'].includes(file.mimetype))});
const uploadLimit=rateLimit({windowMs:60000,limit:6,keyGenerator:req=>req.userId,standardHeaders:true,legacyHeaders:false,message:{error:'storyLimitReached'}});
let processing=0;const activeUsers=new Set();
const capacity=(req,res,next)=>{
 if(processing>=4||activeUsers.has(req.userId))return res.status(429).json({error:'mediaProcessingBusy'});
 processing++;activeUsers.add(req.userId);let done=false;
 const release=()=>{if(done)return;done=true;processing--;activeUsers.delete(req.userId);};
 req.releaseStoryCapacity=release;res.once('finish',release);res.once('close',()=>{if(!req.storyProcessing)release();});next();
};
const urls=(story,viewerId)=>{
 const ticket=jwt.sign({storyId:story.id,viewerId},process.env.JWT_SECRET,{audience:'story-media',expiresIn:'10m'});
 const mediaUrl='/api/stories/'+encodeURIComponent(story.id)+'/media?access='+encodeURIComponent(ticket);
 return{...story,mediaUrl,posterUrl:story.hasPoster?mediaUrl+'&poster=1':null};
};
router.get('/:id/media',optionalAuthMiddleware,asyncHandler(async(req,res)=>{
 let viewerId=req.userId;
 if(req.query.access){try{const token=jwt.verify(String(req.query.access),process.env.JWT_SECRET,{audience:'story-media'});if(token.storyId!==req.params.id||typeof token.viewerId!=='string')return res.sendStatus(404);viewerId=token.viewerId;}catch{return res.sendStatus(404);}}
 if(!viewerId||!await prisma.usuario.findUnique({where:{id:viewerId},select:{id:true}}))return res.sendStatus(404);
 const row=await stories.get(viewerId,req.params.id),poster=req.query.poster==='1',url=poster?row.posterUrl:row.url;
 if(!url)return res.sendStatus(404);
 const file=await streamStoredMedia(url,req.headers.range);
 res.status(file.status).set({...file.headers,'Content-Type':poster?'image/jpeg':row.mime,'Cache-Control':'private, no-store','Cross-Origin-Resource-Policy':'cross-origin','X-Content-Type-Options':'nosniff'});
 req.once('aborted',()=>file.stream.destroy());res.once('close',()=>file.stream.destroy());
 file.stream.on('error',()=>res.destroy());file.stream.pipe(res);
}));
router.use(authMiddleware);
router.get('/',asyncHandler(async(req,res)=>{const result=await stories.list(req.userId,req.query);res.json({...result,data:result.data.map(row=>urls(row,req.userId))});}));
router.post('/',uploadLimit,capacity,upload.single('file'),asyncHandler(async(req,res)=>{
 req.storyProcessing=true;
 try {
 if(!STORY_AUDIENCES.includes(req.body.audience))throw socialError(400,'storyAudienceInvalid');
 const prepared=await prepareStoryMedia(req.file),stored=[];
 try{
  stored.push(await storeStoryFile(prepared.media,req.userId));
  if(prepared.poster)stored.push(await storeStoryFile(prepared.poster,req.userId));
  const story=await stories.publish(req.userId,{url:stored[0].url,posterUrl:stored[1]?.url||null,mime:prepared.media.mimetype,audience:req.body.audience});
  res.status(201).json(urls(story,req.userId));
 }catch(error){try{await removeStoredFiles(stored.map(file=>file.url));}catch(cleanup){console.error(JSON.stringify({event:'story_upload_cleanup_failed',code:cleanup.code||cleanup.name,paths:stored.map(file=>file.path)}));}throw error;}
 }finally{req.storyProcessing=false;req.releaseStoryCapacity?.();}
}));
router.get('/:id',asyncHandler(async(req,res)=>res.json(urls(serializeStory(await stories.get(req.userId,req.params.id),req.userId),req.userId))));
for(const method of ['put','delete'])router[method]('/:id/reaction',asyncHandler(async(req,res)=>{const {story,notification}=await stories.react(req.userId,req.params.id,method==='put');if(notification)void announceNotification(notification).catch(()=>{});res.json(urls(story,req.userId));}));
router.post('/:id/view',asyncHandler(async(req,res)=>res.json(urls(await stories.view(req.userId,req.params.id),req.userId))));
router.delete('/:id',asyncHandler(async(req,res)=>{await stories.remove(req.userId,req.params.id);res.sendStatus(204);void cleanExpiredStories(prisma,removeStoredFiles).catch(error=>console.error(JSON.stringify({event:'story_cleanup_unavailable',code:error.code||error.name}))); }));
export default router;
