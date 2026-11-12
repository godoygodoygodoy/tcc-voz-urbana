const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const os=require('node:os');
const base=process.env.FOLLOWERS_TEST_URL||'http://127.0.0.1:4173/tecti/2026/gpec03';
(async()=>{
 const {createSocialFixture}=await import('../../backend/tests/helpers/socialFixture.js');
 const fixture=await createSocialFixture();
 const server=fixture.app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const apiBase=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const errors=[];let checks=0;
 try{
  async function pageFor(actor,viewport={width:1440,height:900}){
   const context=await browser.newContext({viewport,reducedMotion:'reduce'});const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
   await page.addInitScript(({actor})=>{localStorage.setItem('token','test-'+actor);localStorage.setItem('language','en');localStorage.setItem('user',JSON.stringify({id:actor,name:'Person '+actor,nome:'Person '+actor,username:'person.'+actor,role:'usuario'}));},{actor});
   await page.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort());
   await page.route('**/api/**',async route=>{const url=new URL(route.request().url());const response=await route.fetch({url:apiBase+url.pathname+url.search,headers:{...route.request().headers(),authorization:'Bearer test-'+actor}});await route.fulfill({response});});
   return page;
  }
  const a=await pageFor('a'),b=await pageFor('b');
  const go=async(page,route)=>{await page.goto(base+route,{waitUntil:'domcontentloaded'});await page.locator('.access-menu-trigger').waitFor();};
  const visible=async(page,text)=>{await page.getByText(text,{exact:true}).first().waitFor();checks++;};
  const follow=page=>page.locator('.profile-actions button').first();
  const send=async(page,text)=>{await page.locator('.feed-dm-compose input').fill(text);await page.locator('.feed-dm-compose button').click();await visible(page,text);};
  const privacy=async(value)=>{await b.bringToFront();await go(b,'/profile');await b.getByRole('button',{name:value==='public'?'Private profile':'Public profile',exact:true}).click();await b.getByRole('option',{name:value==='public'?'Public profile':'Private profile',exact:true}).click();await b.getByRole('button',{name:'Save profile',exact:true}).click();await visible(b,'Profile updated successfully!');};

  console.log('Private follow requests and lists');
  await go(a,'/person.b');await a.locator('.social-private-notice').waitFor();assert.equal(await a.getByRole('button',{name:'Message',exact:true}).count(),1);checks++;
  await follow(a).click();await visible(a,'Request pending');assert.equal(fixture.state.follows.length,1);checks++;
  await b.bringToFront();await go(b,'/profile');await visible(b,'Follow requests');await b.getByRole('button',{name:'Accept',exact:true}).click();
  await a.bringToFront();await visible(a,'Conteúdo privado preservado');await visible(a,'Following');
  await a.getByRole('button',{name:'1 Followers',exact:true}).click();await a.getByRole('dialog').getByRole('link',{name:/Person a/}).waitFor();checks++;await a.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();
  await follow(a).click();await a.locator('.social-private-notice').waitFor();checks++;

  console.log('Public follow and independent chat budgets');
  await privacy('public');assert.equal(fixture.user('b').perfilPrivado,false);checks++;
  await a.bringToFront();await visible(a,'Conteúdo privado preservado');await follow(a).click();await visible(a,'Following');assert.equal(fixture.edge('a','b').status,'ACEITA');checks++;
  await a.getByRole('button',{name:'Message',exact:true}).click();await a.locator('.feed-dm-compose input:not(:disabled)').waitFor();await visible(a,'3 of 3 messages remaining for you.');
  for(let i=1;i<=3;i++)await send(a,'Mensagem A '+i);
  await a.locator('.feed-dm-limit').waitFor();assert.equal(await a.locator('.feed-dm-compose input').count(),0);checks++;await a.reload();await a.locator('.feed-dm-limit').waitFor();await visible(a,'Mensagem A 1');
  const conversationId=fixture.state.conversations[0].id;
  await b.bringToFront();await go(b,'/person.a');await b.getByRole('button',{name:'Message',exact:true}).click();await visible(b,'3 of 3 messages remaining for you.');
  for(let i=1;i<=3;i++)await send(b,'Mensagem B '+i);
  await b.locator('.feed-dm-limit').waitFor();assert.equal(fixture.state.conversations.length,1);assert.equal(fixture.state.messages.length,6);checks+=2;

  console.log('Mutual following unlocks; unfollow restores cumulative limit');
  await go(b,'/person.a');await follow(b).click();await visible(b,'Friends · mutual following');
  await a.bringToFront();await a.locator('.feed-dm-compose input:not(:disabled)').waitFor();await visible(a,'You follow each other. Unlimited messaging.');assert.equal(await a.locator('.feed-message').count(),6);checks++;
  for(let i=4;i<=7;i++)await send(a,'Mensagem A '+i);
  await b.bringToFront();await follow(b).click();await a.bringToFront();await a.locator('.feed-dm-limit').waitFor();assert.equal(await a.locator('.feed-message').count(),10);checks++;
  await a.reload();await a.locator('.feed-dm-limit').waitFor();assert.equal(await a.locator('.feed-message').count(),10);assert.equal(fixture.state.conversations[0].id,conversationId);checks+=2;

  console.log('Any profile can start a new conversation');
  await a.getByRole('button',{name:'New conversation',exact:true}).click();await a.locator('.feed-discovery-search input').fill('Person c');
  const person=a.locator('.feed-search-person').filter({hasText:'Person c'});await person.getByRole('button',{name:'Send message',exact:true}).click();await visible(a,'3 of 3 messages remaining for you.');await send(a,'Mensagem separada');await visible(a,'2 of 3 messages remaining for you.');assert.equal(fixture.state.conversations.length,2);checks++;

  console.log('Private profile keeps followers; mobile layouts');
  await privacy('private');assert.equal(fixture.edge('a','b').status,'ACEITA');checks++;
  const c=await pageFor('c',{width:390,height:844});await go(c,'/person.b');await c.locator('.social-private-notice').waitFor();await follow(c).click();await visible(c,'Request pending');
  const profileScreenshot=path.join(os.tmpdir(),'voz-followers-private-mobile.png');await c.screenshot({path:profileScreenshot,fullPage:true});console.log('Profile screenshot: '+profileScreenshot);
  await a.setViewportSize({width:390,height:844});await go(a,'/feed#conversations');await a.locator('.feed-dm-contact').filter({hasText:'Person b'}).click();await a.locator('.feed-dm-limit').waitFor();await visible(a,'Mensagem A 1');
  const chatScreenshot=path.join(os.tmpdir(),'voz-followers-chat-mobile.png');await a.screenshot({path:chatScreenshot,fullPage:true});console.log('Chat screenshot: '+chatScreenshot);
  for(const page of [a,c]){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));checks++;}
  assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,browserErrors:errors,api:'actual routes with isolated in-memory persistence'}));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));fixture.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
