const {chromium}=require('playwright'),assert=require('node:assert/strict');
const base=process.env.PROFILE_ERROR_TEST_URL||'http://127.0.0.1:4173/tecti/2026/gpec03';
(async()=>{
 const {createSocialFixture}=await import('../../backend/tests/helpers/socialFixture.js');const f=await createSocialFixture();
 const server=f.app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const errors=[],calls=[];let failStats=true,failNotifications=true,checks=0;
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{localStorage.setItem('token','test-a');localStorage.setItem('language','en');localStorage.setItem('user',JSON.stringify({id:'a',name:'Person a',username:'person.a',role:'usuario'}));});
  await page.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort());
  await page.route('**/api/**',async route=>{const url=new URL(route.request().url());calls.push(url.pathname);if(url.pathname.includes('/profile-features/')&&url.pathname.endsWith('/stats')&&failStats||url.pathname==='/api/notifications'&&failNotifications)return route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({error:'Rota não encontrada',code:'API_ROUTE_NOT_FOUND'})});const response=await route.fetch({url:'http://127.0.0.1:'+server.address().port+url.pathname+url.search,headers:{...route.request().headers(),authorization:'Bearer test-a'}});await route.fulfill({response});});
  console.log('Own profile with real failure states');await page.goto(base+'/person.a');const stats=page.locator('section').filter({has:page.getByRole('heading',{name:'Civic participation',exact:true})});await stats.getByText('Could not load or save profile data.',{exact:true}).waitFor();assert.equal(await stats.getByText('Posts',{exact:true}).count(),0);checks++;
  await page.getByRole('button',{name:'Notifications',exact:true}).click();const notice=page.getByText('Could not load notifications. Check the API and try again.',{exact:true});await notice.waitFor();assert.equal(await page.getByText('No notifications',{exact:true}).count(),0);checks++;
  failNotifications=false;await notice.locator('..').getByRole('button',{name:'Try again',exact:true}).click();await notice.waitFor({state:'hidden'});checks++;
  failStats=false;await stats.getByRole('button',{name:'Try again',exact:true}).click();await stats.getByText('Posts',{exact:true}).waitFor();checks++;
  console.log('Other profile and follow requests');await page.goto(base+'/person.c');await page.locator('.profile-common').waitFor();await page.getByRole('button',{name:'Follow',exact:true}).click();await page.getByRole('button',{name:'Following',exact:true}).waitFor();assert.ok(f.state.follows.some(row=>row.followerId==='a'&&row.followingId==='c'&&row.status==='ACEITA'));checks++;
  await page.goto(base+'/profile');await page.getByRole('heading',{name:'Follow requests',exact:true}).waitFor();assert.equal(calls.some(path=>path.includes('/undefined/')||path.includes('/api/api/')),false);assert.deepEqual(errors,[]);checks++;
  console.log(JSON.stringify({checks,browserErrors:errors,database:'isolated memory; no production records changed'}));
 }finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await f.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
