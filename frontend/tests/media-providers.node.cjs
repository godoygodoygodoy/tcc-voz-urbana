const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('GIPHY uses direct requests, bounded pages and no response cache or proxy',async()=>{
 const calls=[],context=vm.createContext({URLSearchParams,Error,fetch:async(url,options)=>{calls.push({url,options});return{ok:true,json:async()=>({data:[],pagination:{count:12,total_count:10000}})};}});
 const module=new vm.SourceTextModule(fs.readFileSync('src/components/stories/giphyProvider.js','utf8'),{context,initializeImportMeta:meta=>{meta.env={VITE_GIPHY_API_KEY:'isolated-public-test-key'};}});await module.link(()=>{});await module.evaluate();
 const provider=module.namespace.giphyProvider;assert.equal(module.namespace.giphyConfigured(),true);
 assert.equal((await provider.search({q:'hello world',kind:'stickers',offset:0})).hasMore,true);
 assert.match(calls[0].url,/^https:\/\/api\.giphy\.com\/v1\/stickers\/search\?/);assert.match(calls[0].url,/q=hello\+world/);assert.equal(calls[0].options.cache,'no-store');assert.equal(calls[0].options.credentials,'omit');
 assert.equal((await provider.search({q:'',offset:492})).hasMore,false);
 await assert.rejects(()=>provider.get('../../secret'),/storyCompositionInvalid/);assert.equal(calls.length,2);
 context.fetch=async()=>({ok:false,status:429});await assert.rejects(()=>provider.search({q:'x'}),/mediaProviderRateLimited/);
});
test('GIPHY missing credentials is explicit and never returns invented media',async()=>{
 let calls=0;const module=new vm.SourceTextModule(fs.readFileSync('src/components/stories/giphyProvider.js','utf8'),{context:vm.createContext({URLSearchParams,Error,fetch:async()=>{calls++;}}),initializeImportMeta:meta=>{meta.env={};}});await module.link(()=>{});await module.evaluate();assert.equal(module.namespace.giphyConfigured(),false);await assert.rejects(()=>module.namespace.giphyProvider.search({q:'x'}),/mediaProviderNotConfigured/);assert.equal(calls,0);
});
