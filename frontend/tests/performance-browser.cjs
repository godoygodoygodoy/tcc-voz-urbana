const {chromium}=require('playwright'),assert=require('node:assert/strict');
const base=process.env.PERFORMANCE_TEST_URL||'http://127.0.0.1:4173/tecti/2026/gpec03';
(async()=>{
 const {createSocialFixture}=await import('../../backend/tests/helpers/socialFixture.js');const f=await createSocialFixture();
 const server=f.app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const {createMessaging}=await import('../../backend/src/services/messaging.js');const conversation=await createMessaging(f.db).open('a','b');
 for(let i=0;i<125;i++)f.state.messages.push({id:String(i).padStart(4,'0'),conversaId:conversation.id,remetenteId:i%2?'b':'a',texto:'Historic message '+i,criadaEm:new Date('2026-11-01')});
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const errors=[];let checks=0;
 try{
 const page=await browser.newPage({reducedMotion:'reduce',viewport:{width:1365,height:900}});page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('token','test-a');localStorage.setItem('language','en');localStorage.setItem('user',JSON.stringify({id:'a',name:'Person a',username:'person.a',role:'usuario'}));});
 await page.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
 let failVote=false;let releaseVote;
 await page.route('**/api/**',async r=>{const url=new URL(r.request().url());if(url.pathname.includes('/votes/')&&failVote){await new Promise(resolve=>releaseVote=resolve);return r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'apiUnavailable'})});}const response=await r.fetch({url:'http://127.0.0.1:'+server.address().port+url.pathname+url.search,headers:{...r.request().headers(),authorization:'Bearer test-a'}});await r.fulfill({response});});
 const scripts=[];page.on('request',r=>{if(r.resourceType()==='script')scripts.push(r.url());});
 console.log('Loading paginated chat');await page.goto(base+'/feed#conversations');await page.locator('.feed-dm-messages').getByText('Historic message 124',{exact:true}).waitFor();assert.equal(await page.locator('.feed-message').count(),50);checks++;
 assert.equal(await page.locator('.feed-dm-compose').count(),0);assert.equal(await page.locator('.feed-dm-limit').count()>0,true);checks++;
 await page.getByRole('button',{name:'Load more',exact:true}).click();await page.locator('.feed-dm-messages').getByText('Historic message 25',{exact:true}).waitFor();assert.equal(await page.locator('.feed-message').count(),100);checks++;
 await page.getByRole('button',{name:'Load more',exact:true}).click();await page.locator('.feed-dm-messages').getByText('Historic message 0',{exact:true}).waitFor();assert.equal(await page.locator('.feed-message').count(),125);assert.equal(await page.getByRole('button',{name:'Load more',exact:true}).count(),0);checks+=2;
 assert.equal(scripts.some(url=>/ThreeCityBackdrop|\/Map-/.test(url)),false);checks++;
 console.log('Testing optimistic rollback');await page.goto(base+'/feed');const vote=page.locator('.feed-post').first().getByRole('button',{name:'Like report',exact:true});await vote.waitFor();
 const before=await vote.textContent();failVote=true;await vote.click();await page.waitForFunction(()=>!!document.querySelector('.feed-post-actions button.text-fuchsia-300'));assert.notEqual(await vote.textContent(),before);checks++;
 releaseVote();await page.waitForFunction(()=>!document.querySelector('.feed-post-actions button.text-fuchsia-300'));assert.equal(await vote.textContent(),before);checks++;
 console.log('Testing navigation');await page.locator('.site-menu-trigger').click();await page.locator('.site-menu-link').nth(4).click();await page.waitForURL(base+'/#sobre');await page.waitForFunction(()=>{const el=document.getElementById('sobre');return el&&Math.abs(el.getBoundingClientRect().top-76)<5;});checks++;
 assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,browserErrors:errors}));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));await f.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

