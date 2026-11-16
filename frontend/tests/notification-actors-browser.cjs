const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),os=require('node:os');
const base=process.env.ACTIVITY_TEST_URL||'http://127.0.0.1:4173/tecti/2026/gpec03';
(async()=>{
 const {createSocialFixture}=await import('../../backend/tests/helpers/socialFixture.js');
 const {writeNotification}=await import('../../backend/src/services/notifications.js');
 const f=await createSocialFixture();f.user('c').nome='Pessoa com nome de exibicao longo '.repeat(3);
 f.user('c').fotoPerfil='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
 const titles={STORY:'notificationStoryTitle',NOVO_SEGUIDOR:'Novo seguidor',COMENTARIO:'notificationCOMENTARIOTitle',MENCAO:'notificationMENCAOTitle'};
 for(const type of Object.keys(titles))await writeNotification(f.db,{usuarioId:'a',autorId:'c',tipo:type,titulo:titles[type],mensagem:'notificationStoryBody',link:'/problem/public-post',eventKey:type});
 await writeNotification(f.db,{usuarioId:'a',tipo:'STORY',titulo:'notificationStoryTitle',mensagem:'notificationStoryBody',link:'/problem/public-post',eventKey:'old'});
 const server=f.app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const errors=[];let checks=0;
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{localStorage.setItem('token','test-a');localStorage.setItem('language','en');localStorage.setItem('user',JSON.stringify({id:'a',name:'Person a',username:'person.a',role:'usuario'}));});
  await page.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort());
  await page.route('**/api/**',async route=>{const u=new URL(route.request().url());const response=await route.fetch({url:'http://127.0.0.1:'+server.address().port+u.pathname+u.search,headers:{...route.request().headers(),authorization:'Bearer test-a'}});await route.fulfill({response});});
  await page.goto(base+'/feed#notifications');const rows=page.locator('.feed-notification');await rows.nth(4).waitFor();
  for(const action of ['liked your story.','started following you.','commented on your post.','mentioned you in a comment.']){await rows.getByText(action,{exact:true}).waitFor();checks++;}
  assert.equal(await rows.locator('img.avatar').count(),4);assert.equal(await rows.locator('img.avatar').first().getAttribute('src'),f.user('c').fotoPerfil);checks++;
  assert.equal(await rows.getByText('Profile unavailable',{exact:true}).count(),1);checks++;
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks++;}
  await rows.locator('.notification-avatar[href]').first().click();await page.waitForURL('**/person.c');checks++;
  await page.getByRole('button',{name:'Notifications',exact:true}).first().click();const compact=page.locator('.notification-item--compact');await compact.nth(4).waitFor();assert.equal(await compact.locator('img.avatar').count(),4);checks++;
  await compact.locator('.notification-identity a').first().click();await page.waitForURL('**/person.c');assert.equal(await page.locator('.notification-item--compact').count(),0);checks++;
  await page.goto(base+'/feed#notifications');await page.screenshot({path:path.join(os.tmpdir(),'voz-notification-actors.png'),fullPage:true});
  assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,browserErrors:errors,widths:[320,390,768,1440],storage:'isolated in-memory'}));
 }finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));f.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
