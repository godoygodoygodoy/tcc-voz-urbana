import {createHash} from 'node:crypto';
const widths=new Set([480,960,1440]);
export function imageVariant(query){
  if(query.width===undefined)return null;
  const width=Number(query.width);
  if(!widths.has(width)||query.format!=='webp')throw Object.assign(new Error('mediaInvalid'),{status:400,code:'mediaInvalid'});
  return width;
}
// Uploaded object names are UUIDs and storage uses upsert:false. Authorization is
// always rechecked before this validator/cache; a cached image grants no access.
export const imageEtag=(image,width)=>'"'+createHash('sha256').update(JSON.stringify([image.id,image.url,width||'original','webp-v1'])).digest('hex')+'"';
let sharpModule;
const processor=()=>sharpModule||(sharpModule=import('sharp').then(({default:sharp})=>{sharp.cache({memory:8,files:0,items:16});sharp.concurrency(1);return sharp;}));
export function createMediaVariants(read,{maxBytes=16*1024*1024,maxParallel=2,maxEntries=128}={}){
  const cache=new Map(),pending=new Map(),waiting=[];let bytes=0,running=0;
  const acquire=async()=>{if(running>=maxParallel)await new Promise(resolve=>waiting.push(resolve));else running++;};
  const release=()=>{const next=waiting.shift();if(next)next();else running--;};
  return async(image,width)=>{
    const key=imageEtag(image,width),hit=cache.get(key);
    if(hit){cache.delete(key);cache.set(key,hit);return hit;}
    if(pending.has(key))return pending.get(key);
    if(pending.size>=32)throw Object.assign(new Error('mediaInvalid'),{status:503});
    const work=(async()=>{
      await acquire();
      try{
        const file=await read(image.url);let result=file;
        try{
          const sharp=await processor(),input=sharp(file.buffer,{limitInputPixels:16000000}),meta=await input.metadata();
          // Preserve animated GIF/WebP, never silently flatten a user's animation.
          if((meta.pages||1)===1)result={buffer:await input.rotate().resize({width,withoutEnlargement:true}).webp({quality:82,effort:3}).toBuffer(),contentType:'image/webp'};
        }catch{/* Keep the original available when a legacy image cannot be converted. */}
        if(result.buffer.length<=maxBytes){while(cache.size&&(bytes+result.buffer.length>maxBytes||cache.size>=maxEntries)){const oldest=cache.keys().next().value;bytes-=cache.get(oldest).buffer.length;cache.delete(oldest);}cache.set(key,result);bytes+=result.buffer.length;}
        return result;
      }finally{release();}
    })();
    pending.set(key,work);try{return await work;}finally{pending.delete(key);}
  };
}
