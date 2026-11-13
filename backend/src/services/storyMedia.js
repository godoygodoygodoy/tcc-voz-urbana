import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { validateMedia } from '../utils/mediaValidation.js';
import { socialError } from './socialGraph.js';
export const runMediaProcess = (binary, args) => new Promise((resolve,reject) => {
 const child = spawn(binary,args,{windowsHide:true,stdio:['ignore','pipe','pipe']});let output='',size=0;
 const timeout=setTimeout(()=>{child.kill();reject(socialError(503,'mediaProcessingFailed'));},30000);
 child.stdout.on('data',chunk=>{size+=chunk.length;if(size>1024*1024){child.kill();reject(socialError(400,'mediaInvalid'));}else output+=chunk;});
 child.stderr.on('data',()=>{});
 child.once('error',()=>{clearTimeout(timeout);reject(socialError(503,'mediaProcessingUnavailable'));});
 child.once('close',code=>{clearTimeout(timeout);if(code===0)resolve(output);else reject(socialError(400,'mediaInvalid'));});
});
export async function prepareStoryMedia(file,{run=runMediaProcess}={}) {
 validateMedia(file,{video:true,maxSize:20*1024*1024});
 if(file.mimetype.startsWith('image/')){validateMedia(file);return{media:file,poster:null};}
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'voz-story-'));
 try{
  const source=path.join(directory,file.mimetype==='video/mp4'?'input.mp4':'input.webm');await fs.writeFile(source,file.buffer);
  const information=JSON.parse(await run(process.env.FFPROBE_PATH||'ffprobe',['-v','error','-show_streams','-show_format','-of','json',source]));
  const video=information.streams?.find(stream=>stream.codec_type==='video');
  const duration=Number(video?.duration||information.format?.duration);
  if(!video||!Number.isFinite(duration)||duration<=0||duration>60||!Number.isInteger(video.width)||!Number.isInteger(video.height)||video.width<1||video.height<1||video.width>3840||video.height>3840||video.width*video.height>3840*2160||!['h264','vp8','vp9','av1'].includes(video.codec_name))throw socialError(400,'storyVideoInvalid');
  // Preserve the validated video; only the small preview needs decoding/encoding.
  const poster=path.join(directory,'poster.jpg');
  await run(process.env.FFMPEG_PATH||'ffmpeg',['-nostdin','-v','error','-threads','1','-i',source,'-frames:v','1','-vf','scale=480:480:force_original_aspect_ratio=decrease','-q:v','3',poster]);
  return{media:file,poster:{mimetype:'image/jpeg',buffer:await fs.readFile(poster)}};
 }finally{
  const parent=path.resolve(os.tmpdir()),target=path.resolve(directory);
  if(path.dirname(target)!==parent||!path.basename(target).startsWith('voz-story-'))throw new Error('Unsafe temporary media path');
  await fs.rm(target,{recursive:true,force:true});
 }
}
