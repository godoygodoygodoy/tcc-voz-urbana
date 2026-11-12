import { socialError } from '../services/socialGraph.js';
const signatures = {
 'image/jpeg': b => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
 'image/png': b => b.length >= 24 && b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && b.toString('ascii',12,16) === 'IHDR' && b.readUInt32BE(16) > 0 && b.readUInt32BE(20) > 0 && b.readUInt32BE(16)*b.readUInt32BE(20) <= 60000000,
 'image/webp': b => b.length >= 16 && b.toString('ascii',0,4) === 'RIFF' && b.toString('ascii',8,12) === 'WEBP',
 'image/gif': b => b.length >= 10 && ['GIF87a','GIF89a'].includes(b.toString('ascii',0,6)) && b.readUInt16LE(6)*b.readUInt16LE(8) > 0 && b.readUInt16LE(6)*b.readUInt16LE(8) <= 60000000,
 'video/mp4': b => b.length >= 12 && b.toString('ascii',4,8) === 'ftyp',
 'video/webm': b => b.length >= 4 && b.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3])),
};
export function validateMedia(file, { video = false, maxSize = 5 * 1024 * 1024 } = {}) {
 if (!file || !Buffer.isBuffer(file.buffer) || !file.buffer.length) throw socialError(400,'mediaInvalid');
 if (file.buffer.length > maxSize) throw socialError(413,'mediaTooLarge');
 if (!signatures[file.mimetype] || !video && file.mimetype.startsWith('video/') || !signatures[file.mimetype](file.buffer)) throw socialError(400,'mediaInvalid');
 return file;
}
