const {chromium}=require('playwright'),assert=require('node:assert/strict');
const base=process.env.STORIES_TEST_URL||'http://127.0.0.1:4173/tecti/2026/gpec03';
(async()=>{
 const {createSocialFixture}=await import('../../backend/tests/helpers/socialFixture.js');
 const f=await createSocialFixture(),server=f.app.listen(0,'127.0.0.1');
 await new Promise(resolve=>server.once('listening',resolve));
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),errors=[],checks=[];
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(15000);
  await page.addInitScript(()=>{localStorage.setItem('token','test-a');localStorage.setItem('language','en');localStorage.setItem('user',JSON.stringify({id:'a',name:'Person a',username:'person.a',role:'usuario'}));});
  await page.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
  await page.route('**/api/**',async r=>{const url=new URL(r.request().url()),response=await r.fetch({url:'http://127.0.0.1:'+server.address().port+url.pathname+url.search,headers:{...r.request().headers(),authorization:'Bearer test-a'}});await r.fulfill({response});});
  const own=page.locator('[data-story-author="a"]');
  const close=()=>page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();
  const publish=async()=>{
   const dialog=page.getByRole('dialog');
   await dialog.getByLabel('Text',{exact:true}).fill('Isolated story, never production');
   await dialog.getByRole('button',{name:'Add text',exact:true}).click();
   await dialog.getByRole('button',{name:'Publish story',exact:true}).click();
   await dialog.waitFor({state:'detached'});
  };
  const verifyMedia=async id=>{
   await page.waitForFunction(id=>Array.from(document.querySelectorAll('[data-story-id="'+id+'"] .story-media')).some(media=>media.getAttribute('src')?.includes('/'+id+'/')),id);
   await page.getByRole('button',{name:'Pause story',exact:true}).click();
  };
  await page.goto(base+'/feed');await own.waitFor();assert.equal(await own.count(),1);
  await own.locator('.story-own-open').click();await page.getByRole('dialog').waitFor();await close();
  await own.locator('.story-own-add').click();await page.getByRole('dialog').waitFor();checks.push('empty own photo and plus both open creation');
  await publish();assert.equal(await own.count(),1);assert.match(await own.getAttribute('class'),/is-unseen/);assert.equal(f.state.storyViews.length,0);
  await own.locator('.story-own-add').click();await publish();assert.equal(await own.count(),1);assert.equal(f.state.storyViews.length,0);checks.push('two publications retain a single circle and creation does not mark views');
  const [first,second]=f.state.stories;
  await own.locator('.story-own-open').click();await verifyMedia(first.id);
  await page.getByText('0 views',{exact:true}).waitFor();assert.match(await own.getAttribute('class'),/is-unseen/);
  await page.getByRole('dialog').getByRole('button',{name:'Next',exact:true}).click();await verifyMedia(second.id);
  await page.waitForFunction(()=>!document.querySelector('.story-own.is-unseen'));await close();await page.reload();await own.waitFor();
  assert.doesNotMatch(await own.getAttribute('class'),/is-unseen/);assert.equal(f.state.storyViews.length,2);checks.push('oldest-to-newest playback; gray ring persists per story without counting self as spectator');
  await own.locator('.story-own-add').click();await publish();const third=f.state.stories[2];
  assert.match(await own.getAttribute('class'),/is-unseen/);assert.equal(await own.count(),1);
  await own.locator('.story-own-open').click();await verifyMedia(third.id);
  await page.waitForFunction(()=>!document.querySelector('.story-own.is-unseen'));await close();checks.push('new story restores colored ring and photo starts with unseen content');
  for(const width of [390,1440]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
  await page.evaluate(()=>{localStorage.setItem('voz-urbana-christmas-unlocked','true');localStorage.setItem('voz-urbana-site-theme','christmas');});await page.reload();await own.waitFor();assert.equal(await own.count(),1);assert.doesNotMatch(await own.getAttribute('class'),/is-unseen/);checks.push('mobile, desktop and Christmas theme retain the single circle');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,browserErrors:errors,scope:'isolated fixture; no production writes'}));
 }finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await f.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
