// Functional regression only: existing isolated fixture, never performance data.
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const base=process.env.PERFORMANCE_TEST_URL||'http://127.0.0.1:4173/tecti/2026/gpec03';
(async()=>{
 const {createSocialFixture}=await import('../../backend/tests/helpers/socialFixture.js');const f=await createSocialFixture();
 f.state.problems.length=0;for(let i=0;i<40;i++)f.state.problems.push({id:'paging-'+String(i).padStart(3,'0'),usuarioId:'a',titulo:'Isolated functional fixture '+i,descricao:'No production data is created.',status:'ABERTO',dataCriacao:new Date('2026-11-01')});
 const server=f.app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const errors=[],calls=[];let checks=0,failSave=false,releaseSave;
 try{
  const page=await browser.newPage({viewport:{width:1365,height:900},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{localStorage.setItem('token','test-a');localStorage.setItem('language','en');localStorage.setItem('user',JSON.stringify({id:'a',name:'Person a',username:'person.a',role:'usuario'}));});
  await page.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
  await page.route('**/api/**',async r=>{const u=new URL(r.request().url());calls.push({path:u.pathname,view:u.searchParams.get('view'),method:r.request().method()});if(failSave&&u.pathname.startsWith('/api/saved/')&&r.request().method()==='POST'){await new Promise(resolve=>releaseSave=resolve);return r.fulfill({status:503,json:{error:'apiUnavailable'}});}const response=await r.fetch({url:'http://127.0.0.1:'+server.address().port+u.pathname+u.search,headers:{...r.request().headers(),authorization:'Bearer test-a'}});await r.fulfill({response});});
  await page.goto(base+'/feed#conversations');await page.locator('.feed-dm-shell').waitFor();assert.equal(calls.some(c=>c.path==='/api/problems'),false);assert.equal(calls.some(c=>c.path==='/api/saved'),false);checks+=2;
  await page.goto(base+'/feed');await page.waitForFunction(()=>document.querySelectorAll('.feed-post').length===12);const feedCalls=()=>calls.filter(c=>c.view==='feed').length;assert.equal(feedCalls(),1);assert.equal(calls.some(c=>c.path.startsWith('/api/comments/')),false);checks+=2;
  for(const count of [24,36,40]){await page.locator('.feed-pagination').scrollIntoViewIfNeeded();await page.waitForFunction(count=>document.querySelectorAll('.feed-post').length===count,count);checks++;}
  assert.equal(await page.locator('.feed-pagination button').count(),0);assert.equal(feedCalls(),4);checks+=2;
  await page.evaluate(()=>scrollTo(0,0));const first=page.locator('.feed-post').first();
  await first.getByRole('button',{name:'More options',exact:true}).focus();await page.keyboard.press('Enter');
  failSave=true;await first.getByRole('button',{name:'Save publication',exact:true}).click();
  await first.getByRole('button',{name:'More options',exact:true}).click();const pending=first.getByRole('button',{name:'Remove from saved items',exact:true});await pending.waitFor();assert.equal(await pending.isDisabled(),true);checks++;
  releaseSave();await first.getByRole('button',{name:'Save publication',exact:true}).waitFor();assert.equal(feedCalls(),4);checks++;
  failSave=false;await first.getByRole('button',{name:'Save publication',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('.feed-post-menu').length===0);assert.equal(f.state.saved.some(row=>row.problemaId==='paging-039'),true);checks++;
  await first.getByRole('button',{name:'More options',exact:true}).click();await first.getByRole('button',{name:'Share publication',exact:true}).click();await page.getByRole('dialog').waitFor();await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();assert.equal(feedCalls(),4);checks++;
  await page.evaluate(()=>window.dispatchEvent(new Event('voz-urbana:social-changed')));await page.waitForFunction(()=>document.querySelectorAll('.feed-post').length===40);assert.equal(feedCalls(),4);checks++;
  for(const width of [390,768,1365]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks++;}
  assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,browserErrors:errors,rows:40,feedRequests:feedCalls(),mode:'functional isolated fixture; not benchmark evidence'}));
 }finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));f.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
