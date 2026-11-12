const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function environment(){
 const frames=new Map(),timers=new Map(),events=new Map();let id=0;
 const add=(key,fn)=>{if(!events.has(key))events.set(key,new Set());events.get(key).add(fn);};
 const remove=(key,fn)=>events.get(key)?.delete(fn);
 const document={hidden:false,documentElement:{classList:{toggle(){}},dataset:{}},addEventListener:add,removeEventListener:remove};
 const media={matches:false,addEventListener:add,removeEventListener:remove};
 const context=vm.createContext({document,window:{matchMedia:()=>media,addEventListener:add,removeEventListener:remove},navigator:{hardwareConcurrency:4,deviceMemory:4},innerWidth:1200,matchMedia:()=>media,requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:i=>frames.delete(i),setTimeout:fn=>{timers.set(++id,fn);return id;},clearTimeout:i=>timers.delete(i),useSyncExternalStore:()=>{},console});
 return {context,document,frames,timers,events,emit:key=>[...(events.get(key)||[])].forEach(fn=>fn()),frame:time=>{const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn(time));}};
}
function load(env,name,exports){const source=fs.readFileSync(require('node:path').join(__dirname,'../src/utils',name),'utf8').replace(/^\uFEFF/, '').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');vm.runInContext(source+'\nthis.api={'+exports.join(',')+'};',env.context);return env.context.api;}

test('animations share one clock, stop when idle/hidden and release listeners',()=>{
 const e=environment(),{subscribeAnimation}=load(e,'motion.js',['subscribeAnimation']);let a=0,b=0;
 assert.equal(e.frames.size,0);const stopA=subscribeAnimation(()=>a++),stopB=subscribeAnimation(()=>b++,30);
 assert.equal(e.frames.size,1);e.frame(0);e.frame(17);assert.equal(a,2);assert.equal(b,1);
 e.document.hidden=true;e.emit('visibilitychange');assert.equal(e.frames.size,0);
 e.document.hidden=false;e.emit('visibilitychange');assert.equal(e.frames.size,1);e.frame(1000);assert.equal(b,2);
 stopA();stopB();assert.equal(e.frames.size,0);assert.equal(e.events.get('visibilitychange').size,0);
 subscribeAnimation(()=>false);e.frame(1017);assert.equal(e.frames.size,0);assert.equal(e.events.get('resize').size,0);
});
test('polling never overlaps and starts no work while hidden or disposed',async()=>{
 const e=environment(),{createVisibilityPoller}=load(e,'polling.js',['createVisibilityPoller']);let calls=0,release;
 const poll=createVisibilityPoller(()=>{calls++;return new Promise(resolve=>release=resolve);},3000,{immediate:true});
 await poll.refresh();assert.equal(calls,1);e.document.hidden=true;e.emit('visibilitychange');release();await new Promise(resolve=>setImmediate(resolve));assert.equal(e.timers.size,0);
 e.document.hidden=false;e.emit('visibilitychange');assert.equal(calls,2);poll.dispose();release();await new Promise(resolve=>setImmediate(resolve));assert.equal(e.timers.size,0);assert.equal(e.events.get('visibilitychange').size,0);
 await poll.refresh();assert.equal(calls,2);
});
