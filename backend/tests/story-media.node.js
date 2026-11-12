import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { prepareStoryMedia,runMediaProcess } from '../src/services/storyMedia.js';
test('real MP4 is inspected and receives a compact poster without modifying the source',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'voz-story-video-test-'));
 try{
  const target=path.join(directory,'sample.mp4');await runMediaProcess('ffmpeg',['-nostdin','-v','error','-f','lavfi','-i','color=c=purple:s=240x320:d=1','-c:v','libx264','-pix_fmt','yuv420p','-threads','1',target]);
  const file={mimetype:'video/mp4',buffer:await fs.readFile(target)};const prepared=await prepareStoryMedia(file);assert.equal(prepared.media,file);assert.equal(prepared.poster.mimetype,'image/jpeg');assert.ok(prepared.poster.buffer.length<100000);
  await assert.rejects(prepareStoryMedia(file,{run:async()=>JSON.stringify({format:{duration:'61'},streams:[{codec_type:'video',codec_name:'h264',width:240,height:320}]})}),{status:400});
 }finally{const root=path.resolve(os.tmpdir());if(path.dirname(path.resolve(directory))!==root||!path.basename(directory).startsWith('voz-story-video-test-'))throw Error('Unsafe test path');await fs.rm(directory,{recursive:true,force:true});}
});
