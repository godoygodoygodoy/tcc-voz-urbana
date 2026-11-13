import test from 'node:test';
import assert from 'node:assert/strict';
import { isOwnedObject,storedObjectLocation } from '../src/utils/storagePaths.js';
test('avatar cleanup cannot delete another user or bucket, including encoded Windows traversal',()=>{
 assert.equal(isOwnedObject('/uploads/avatars/a/own.png','avatars','a'),true);
 for(const url of ['/uploads/avatars/b/other.png','/uploads/reports/a/own.png','/uploads/avatars/a/../b/other.png','/uploads/avatars/a/..%2Fb%2Fother.png','/uploads/avatars/a/..%5Cb%5Cother.png'])assert.equal(isOwnedObject(url,'avatars','a'),false,url);
 const base='https://storage.example';assert.equal(isOwnedObject(base+'/storage/v1/object/sign/avatars/a/file.png?token=secret','avatars','a',base),true);
 assert.equal(isOwnedObject(base+'.attacker.test/storage/v1/object/public/avatars/a/file.png','avatars','a',base),false);
 assert.deepEqual(storedObjectLocation(base+'/storage/v1/object/sign/posts/a/file.png?token=secret',base),{bucket:'posts',path:'a/file.png'});
});
