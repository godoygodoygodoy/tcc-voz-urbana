import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('private local media serves bounded byte ranges without reading the whole file',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'voz-story-ranges-'));process.env.SUPABASE_STORAGE_ENABLED='false';process.env.UPLOAD_DIR=directory;
 try{
  const {streamStoredMedia}=await import('../src/config/storage.js');await fs.mkdir(path.join(directory,'posts','a'),{recursive:true});await fs.writeFile(path.join(directory,'posts','a','video.mp4'),Buffer.from('0123456789'));
  const read=async range=>{const result=await streamStoredMedia('/uploads/posts/a/video.mp4',range);const chunks=[];for await(const chunk of result.stream)chunks.push(chunk);return{...result,body:Buffer.concat(chunks).toString()};};
  const first=await read('bytes=2-5');assert.equal(first.status,206);assert.equal(first.body,'2345');assert.equal(first.headers['Content-Range'],'bytes 2-5/10');
  assert.equal((await read('bytes=-3')).body,'789');assert.equal((await read('bytes=8-')).body,'89');assert.equal((await read()).body,'0123456789');
  for(const range of ['bytes=99-','bytes=8-2','bytes=0-1,5-6','bytes=-'])await assert.rejects(read(range),{status:416});
  await assert.rejects(streamStoredMedia('/uploads/posts/../../outside.mp4'),{status:404});
 }finally{if(path.dirname(path.resolve(directory))!==path.resolve(os.tmpdir())||!path.basename(directory).startsWith('voz-story-ranges-'))throw Error('Unsafe test directory');await fs.rm(directory,{recursive:true,force:true});}
});
