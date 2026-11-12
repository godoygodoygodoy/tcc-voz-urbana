import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMedia } from '../src/utils/mediaValidation.js';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
test('media checks signatures, dimensions, size and explicit video permission',()=>{
 assert.equal(validateMedia({mimetype:'image/png',buffer:png}).mimetype,'image/png');
 for(const mimetype of ['image/png','image/jpeg','image/gif','image/webp'])assert.throws(()=>validateMedia({mimetype,buffer:Buffer.from('<svg onload="alert(1)">')}),{status:400});
 assert.throws(()=>validateMedia({mimetype:'image/png',buffer:png},{maxSize:10}),{status:413});
 const big=Buffer.from(png);big.writeUInt32BE(100000,16);big.writeUInt32BE(100000,20);assert.throws(()=>validateMedia({mimetype:'image/png',buffer:big}),{status:400});
 const mp4=Buffer.from('000000186674797069736f6d','hex');assert.throws(()=>validateMedia({mimetype:'video/mp4',buffer:mp4}),{status:400});assert.equal(validateMedia({mimetype:'video/mp4',buffer:mp4},{video:true}).mimetype,'video/mp4');
});
