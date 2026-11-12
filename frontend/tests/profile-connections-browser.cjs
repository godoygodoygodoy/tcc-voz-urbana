const {chromium}=require('playwright'),assert=require('node:assert/strict'),os=require('node:os'),path=require('node:path');
const base=process.env.PROFILE_CONNECTIONS_TEST_URL||'http://127.0.0.1:4173/tecti/2026/gpec03';
(async()=>{
 const {createSocialFixture}=await import('../../backend/tests/helpers/socialFixture.js');const f=await createSocialFixture();f.user('b').perfilPrivado=false;
 const edge=(from,to)=>f.state.follows.push({id:from+'-'+to,followerId:from,followingId:to,status:'ACEITA',criadaEm:new Date()});edge('c','a');edge('c','b');
 for(let i=0;i<35;i++){const id='person'+String(i).padStart(2,'0');f.state.users.push({...f.user('c'),id,nome:'Common '+i,username:id,perfilPrivado:false});edge('a',id);edge('b',id);}
 const {createMessaging}=await import('../../backend/src/services/messaging.js');const service=createMessaging(f.db),conversation=await service.open('a','b');for(let i=0;i<3;i++)await service.send('a',conversation.id,'Preserved message '+i);
 const server=f.app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});let checks=0;const errors=[],calls=[];
 try{
 const page=await browser.newPage({viewport:{width:1365,height:900},reducedMotion:'reduce'});page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('token','test-a');localStorage.setItem('language','en');localStorage.setItem('user',JSON.stringify({id:'a',name:'Person a',username:'person.a',role:'usuario'}));});
 await page.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
 await page.route('**/api/**',async r=>{const url=new URL(r.request().url());calls.push({path:url.pathname,search:url.search,method:r.request().method()});const response=await r.fetch({url:'http://127.0.0.1:'+server.address().port+url.pathname+url.search,headers:{...r.request().headers(),authorization:'Bearer test-a'}});await r.fulfill({response});});
 console.log('Common previews and pagination');await page.goto(base+'/person.b');const followers=page.locator('[data-common-direction="followers"]'),following=page.locator('[data-common-direction="following"]');await following.getByText('(35)',{exact:true}).waitFor();
 assert.equal(await followers.locator('li').count(),1);assert.equal(await followers.locator('a').getAttribute('href'),'/tecti/2026/gpec03/person.c');assert.equal(await following.locator('li').count(),4);checks+=3;
 await page.waitForTimeout(700);assert.equal(calls.filter(c=>c.path.endsWith('/common-connections')&&!c.search).length,1);checks++;
 await following.getByRole('button',{name:'View all',exact:true}).click();const dialog=page.getByRole('dialog');await dialog.getByRole('heading',{name:'Following in common'}).waitFor();assert.equal(await dialog.locator('li').count(),30);checks++;
 await dialog.getByRole('button',{name:'Next',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('.social-network-dialog li').length===5);checks++;
 await dialog.getByRole('button',{name:'Close',exact:true}).click();await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);checks++;
 await page.locator('.profile-common').screenshot({path:path.join(os.tmpdir(),'voz-profile-common-mobile.png')});
 console.log('Existing exhausted conversation');await page.getByRole('button',{name:'Message',exact:true}).evaluate(el=>{el.click();el.click();});await page.waitForURL(base+'/feed#conversations');await page.locator('.feed-dm-messages').getByText('Preserved message 2',{exact:true}).waitFor();assert.equal(f.state.conversations.length,1);assert.equal(await page.locator('.feed-dm-compose').count(),0);assert.equal(await page.locator('.feed-dm-limit').count(),1);assert.equal(calls.filter(c=>c.path==='/api/conversations/b'&&c.method==='POST').length,1);checks+=4;
 console.log('Private profile and mutual follow');f.user('b').perfilPrivado=true;await page.goto(base+'/person.b');await page.locator('.social-private-notice').waitFor();assert.equal(await page.locator('.profile-common').count(),0);checks++;
 await page.getByRole('button',{name:'Message',exact:true}).click();await page.waitForURL(base+'/feed#conversations');await page.locator('.feed-dm-messages').getByText('Preserved message 2',{exact:true}).waitFor();checks++;
 edge('a','b');edge('b','a');await page.goto(base+'/person.b');await following.getByText('(35)',{exact:true}).waitFor();await page.getByRole('button',{name:'Message',exact:true}).click();await page.waitForURL(base+'/feed#conversations');await page.locator('.feed-dm-compose input:not(:disabled)').waitFor();assert.equal(await page.locator('.feed-dm-limit').count(),0);assert.equal(f.state.messages.length,3);checks+=2;
 await page.goto(base+'/person.a');await page.locator('.profile-actions').waitFor();assert.equal(await page.getByRole('button',{name:'Message',exact:true}).count(),0);assert.equal(await page.locator('.profile-common').count(),0);checks+=2;
 await page.goto(base+'/person00');await page.locator('.profile-common').getByText('No people in common yet.',{exact:true}).first().waitFor();checks++;
 await page.locator('.access-menu-trigger').click();await page.locator('.access-menu button').filter({hasText:/^Español/}).click();await page.getByRole('heading',{name:'Conexiones en común',exact:true}).waitFor();checks++;
 assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,browserErrors:errors,screenshot:path.join(os.tmpdir(),'voz-profile-common-mobile.png')}));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));await f.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
