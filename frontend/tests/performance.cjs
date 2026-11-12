const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),zlib=require('node:zlib');
const {chromium}=require('playwright');
const argument=(name,fallback)=>process.argv.includes(name)?process.argv[process.argv.indexOf(name)+1]:fallback;
const root=path.resolve(argument('--dist','frontend/dist'));
const output=path.resolve(argument('--out','frontend/performance-artifacts/result.json'));
const runs=Number(argument('--runs','2'));
const base='/tecti/2026/gpec03';
(async()=>{
 const {createSocialFixture}=await import('../../backend/tests/helpers/socialFixture.js');
 const fixture=await createSocialFixture();
 fixture.state.problems.length=0;
 for(let i=0;i<12;i++)fixture.state.problems.push({id:'post-'+i,usuarioId:'a',titulo:'Ocorrência de teste '+i,descricao:'Conteúdo do morador preservado durante a medição.',endereco:'Local de teste',status:'ABERTO',dataCriacao:new Date('2026-11-01T12:00:00Z'),imagens:[]});
 const api=fixture.app.listen(0,'127.0.0.1');await new Promise(resolve=>api.once('listening',resolve));
 const apiOrigin='http://127.0.0.1:'+api.address().port;
 const cache=new Map();
 const server=http.createServer((req,res)=>{
  let relative;try{relative=decodeURIComponent(new URL(req.url,'http://local').pathname).replace(new RegExp('^'+base),'');}catch{res.writeHead(400);res.end();return;}
  let file=path.resolve(root,'.'+relative);if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403);res.end();return;}
  if(!fs.existsSync(file)||fs.statSync(file).isDirectory())file=path.join(root,'index.html');
  const extension=path.extname(file),types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.svg':'image/svg+xml','.json':'application/json'};
  let data=cache.get(file);if(!data){const raw=fs.readFileSync(file);const compressed=['.html','.js','.css','.svg','.json'].includes(extension);data={body:compressed?zlib.gzipSync(raw):raw,compressed};cache.set(file,data);}
  res.setHeader('Content-Type',types[extension]||'application/octet-stream');res.setHeader('Cache-Control',extension==='.html'?'no-cache':'public, max-age=86400');if(data.compressed)res.setHeader('Content-Encoding','gzip');res.end(data.body);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const result={environment:{browser:browser.version(),cpuSlowdown:4,viewport:[1365,900],network:'1.6 Mbps down / 750 Kbps up / 40 ms RTT',runs,api:'same isolated routes/in-memory fixture; external maps/fonts blocked',gpu:'headless Chrome, may use software rendering; not a physical low-end device'},samples:[]};
 try{
  for(const route of ['/','/feed'])for(const theme of ['normal','christmas'])for(let run=1;run<=runs;run++){
   const context=await browser.newContext({viewport:{width:1365,height:900},reducedMotion:'no-preference'}),page=await context.newPage();const errors=[],calls=[],requests=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(({theme})=>{
    localStorage.setItem('language','en');localStorage.setItem('token','test-a');localStorage.setItem('user',JSON.stringify({id:'a',name:'Person a',username:'person.a',role:'usuario'}));localStorage.setItem('voz-urbana-christmas-unlocked','true');localStorage.setItem('voz-urbana-site-theme',theme);
    Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>4});Object.defineProperty(navigator,'deviceMemory',{get:()=>4});
    window.__perf={lcp:0,cls:0,longTasks:[],interactions:[],frames:[],rafCallbacks:0,commits:0};
    const observe=(type,callback,options={})=>{try{new PerformanceObserver(list=>list.getEntries().forEach(callback)).observe({type,buffered:true,...options});}catch{}};
    observe('largest-contentful-paint',e=>window.__perf.lcp=e.startTime);observe('layout-shift',e=>{if(!e.hadRecentInput)window.__perf.cls+=e.value;});observe('longtask',e=>window.__perf.longTasks.push(e.duration));observe('event',e=>{if(e.interactionId)window.__perf.interactions.push(e.duration);},{durationThreshold:16});
    const original=window.requestAnimationFrame.bind(window);window.__perfFrame=original;window.requestAnimationFrame=cb=>original(time=>{window.__perf.rafCallbacks++;cb(time);});
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__={supportsFiber:true,renderers:new Map(),inject(renderer){this.renderers.set(1,renderer);return 1;},onCommitFiberRoot(){window.__perf.commits++;},onCommitFiberUnmount(){}};
   },{theme});
   await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
   await page.route('**/api/**',async r=>{const url=new URL(r.request().url()),at=Date.now();const response=await r.fetch({url:apiOrigin+url.pathname+url.search,headers:{...r.request().headers(),authorization:'Bearer test-a'}});calls.push({path:url.pathname,ms:Date.now()-at});await r.fulfill({response});});
   const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:40,downloadThroughput:1600000/8,uploadThroughput:750000/8});await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await cdp.send('Performance.enable');
   cdp.on('Network.responseReceived',e=>requests.push({url:e.response.url,type:e.type,mime:e.response.mimeType}));
   await page.goto(origin+base+route,{waitUntil:'domcontentloaded'});await page.locator(route==='/'?'#urban-hero-title':'.feed-title').first().waitFor({timeout:60000});await page.waitForTimeout(2200);
   const start=(await cdp.send('Performance.getMetrics')).metrics;await page.evaluate(()=>{window.__perf.frames=[];window.__perf.rafCallbacks=0;window.__perf.commits=0;window.__sampling=true;let last;const sample=t=>{if(last)window.__perf.frames.push(t-last);last=t;if(window.__sampling)window.__perfFrame(sample);};window.__perfFrame(sample);});
   for(let i=0;i<8;i++){await page.mouse.move(120+i*140,160+(i%3)*110,{steps:5});await page.mouse.wheel(0,i<4?250:-250);await page.waitForTimeout(280);}
   await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(250);const clickAt=Date.now();await page.locator('.site-menu-trigger').click();await page.locator('.site-menu.is-open').waitFor();const menuOpenMs=Date.now()-clickAt;await page.waitForTimeout(180);await page.locator('.site-menu-trigger').click();await page.waitForTimeout(700);
   const end=(await cdp.send('Performance.getMetrics')).metrics;
   const metrics=await page.evaluate(()=>{window.__sampling=false;const p=window.__perf,frames=p.frames.sort((a,b)=>a-b),resources=performance.getEntriesByType('resource');return {lcpMs:p.lcp,cls:p.cls,interactionMaxMs:Math.max(0,...p.interactions),longTasks:p.longTasks.length,longTaskMs:p.longTasks.reduce((a,b)=>a+b,0),frameP50Ms:frames[Math.floor(frames.length*.5)]||0,frameP95Ms:frames[Math.floor(frames.length*.95)]||0,framesOver34ms:frames.filter(x=>x>34).length,sampleFrames:frames.length,rafCallbacks:p.rafCallbacks,reactCommits:p.commits,jsBytes:resources.filter(r=>/\.js(?:\?|$)/.test(r.name)).reduce((n,r)=>n+r.encodedBodySize,0),resourceBytes:resources.reduce((n,r)=>n+r.encodedBodySize,0),domNodes:document.querySelectorAll('*').length,canvasCount:document.querySelectorAll('canvas').length};});
   const values=list=>Object.fromEntries(list.map(x=>[x.name,x.value])),before=values(start),after=values(end);
   const sample={route,theme,run,...metrics,menuOpenMs,mainThreadMs:(after.TaskDuration-before.TaskDuration)*1000,styleLayoutMs:((after.LayoutDuration-before.LayoutDuration)+(after.RecalcStyleDuration-before.RecalcStyleDuration))*1000,heapMB:after.JSHeapUsedSize/1024/1024,apiRequests:calls.length,scriptRequests:requests.filter(r=>r.type==='Script').length,errors};result.samples.push(sample);console.log(JSON.stringify(sample));await context.close();
  }
  const median=values=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)];result.summary=[];
  for(const route of ['/','/feed'])for(const theme of ['normal','christmas']){const group=result.samples.filter(s=>s.route===route&&s.theme===theme),summary={route,theme};for(const field of ['lcpMs','cls','interactionMaxMs','frameP50Ms','frameP95Ms','framesOver34ms','mainThreadMs','styleLayoutMs','heapMB','apiRequests','scriptRequests','jsBytes','resourceBytes','domNodes','canvasCount','rafCallbacks','reactCommits','menuOpenMs'])summary[field]=median(group.map(s=>s[field]));result.summary.push(summary);}
  fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log('Saved '+output);
 }finally{await browser.close();await new Promise(r=>server.close(r));await new Promise(r=>api.close(r));fixture.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
