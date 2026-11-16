const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const os=require('node:os');
const base=process.env.PEOPLE_TEST_URL||'http://127.0.0.1:4173/tecti/2026/gpec03';
(async()=>{
 const {createSocialFixture}=await import('../../backend/tests/helpers/socialFixture.js');
 const fixture=await createSocialFixture();
 fixture.user('a').nome='Person Ana';
 fixture.user('b').nome='Person '+ 'NomeMuitoLongo'.repeat(9);
 fixture.user('b').username='person.private.long.username';
 fixture.user('c').nome='Person Caio';
 fixture.user('c').apresentacao='Apresentacao publica '+ 'com descricao longa '.repeat(15);
 fixture.user('c').fotoPerfil='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
 const server=fixture.app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 let page,checks=0;const errors=[];let follows=0;
 try{
  page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{localStorage.setItem('token','test-a');localStorage.setItem('language','en');localStorage.setItem('user',JSON.stringify({id:'a',name:'Person Ana',username:'person.a',role:'usuario'}));});
  await page.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort());
  await page.route('**/api/**',async route=>{
   const url=new URL(route.request().url());
   if(url.pathname.endsWith('/users/search'))return route.fulfill({json:{data:fixture.state.users.map(({id,nome,username,fotoPerfil,apresentacao,perfilPrivado})=>({id,nome,username,fotoPerfil,apresentacao:perfilPrivado?null:apresentacao})),total:3,page:1,limit:12}});
   if(url.pathname.endsWith('/follow')){follows++;await new Promise(resolve=>setTimeout(resolve,250));}
   const response=await route.fetch({url:'http://127.0.0.1:'+server.address().port+url.pathname+url.search,headers:{...route.request().headers(),authorization:'Bearer test-a'}});await route.fulfill({response});
  });
  await page.goto(base+'/feed#search');
  await page.locator('.feed-discovery-search input').fill('Person');
  const rows=page.locator('.feed-search-person');await rows.nth(2).waitFor();
  const own=rows.filter({hasText:'Person Ana'}),privateRow=rows.filter({hasText:'NomeMuitoLongo'}),publicRow=rows.filter({hasText:'Person Caio'});
  assert.equal(await own.getByRole('button').count(),0);checks++;
  await privateRow.getByRole('button',{name:'Follow',exact:true}).click();
  assert.equal(await privateRow.locator('.feed-search-follow').isDisabled(),true);
  await privateRow.getByRole('button',{name:'Request pending',exact:true}).waitFor();assert.equal(fixture.edge('a','b').status,'PENDENTE');checks++;
  await privateRow.locator('.feed-search-follow').click();await privateRow.getByRole('button',{name:'Follow',exact:true}).waitFor();assert.equal(fixture.edge('a','b'),undefined);checks++;
  await publicRow.getByRole('button',{name:'Follow',exact:true}).click();await publicRow.getByRole('button',{name:'Following',exact:true}).waitFor();assert.equal(fixture.edge('a','c').status,'ACEITA');checks++;
  await publicRow.locator('.feed-search-follow').click();await publicRow.getByRole('button',{name:'Follow',exact:true}).waitFor();assert.equal(fixture.edge('a','c'),undefined);assert.equal(follows,4);checks++;
  fixture.state.follows.push({id:'existing-reverse',followerId:'c',followingId:'a',status:'ACEITA',criadaEm:new Date(),atualizadaEm:new Date()});
  await page.evaluate(()=>window.dispatchEvent(new Event('voz-urbana:social-changed')));
  await publicRow.getByRole('button',{name:'Follow back',exact:true}).waitFor();checks++;
  await publicRow.locator('.feed-search-follow').click();await publicRow.getByText('Friends · mutual following',{exact:true}).waitFor();checks++;
  assert.equal(await publicRow.locator('img.avatar').getAttribute('src'),fixture.user('c').fotoPerfil);checks++;
  for(const width of [1440,1024,768,480,390,320]){
   await page.setViewportSize({width,height:1000});
   const layout=await rows.evaluateAll(elements=>elements.map(row=>{const rect=row.getBoundingClientRect(),main=row.querySelector('.feed-search-person-main').getBoundingClientRect(),avatar=row.querySelector('.avatar').getBoundingClientRect(),actions=row.querySelector('.feed-person-actions')?.getBoundingClientRect();return{fits:row.scrollWidth<=row.clientWidth,avatarSquare:Math.abs(avatar.width-avatar.height)<1,avatarWidth:avatar.width,mainFits:main.right<=rect.right,actionsFit:!actions||(actions.left>=rect.left&&actions.right<=rect.right),noOverlap:!actions||main.right<=actions.left+1||main.bottom<=actions.top+1};}));
   for(const result of layout){assert.ok(result.fits&&result.avatarSquare&&result.mainFits&&result.actionsFit&&result.noOverlap,JSON.stringify({width,...result}));assert.equal(result.avatarWidth,44);checks++;}
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'viewport overflow '+width);checks++;
   if([1440,390].includes(width))await page.locator('.feed-search-section').screenshot({path:path.join(os.tmpdir(),'voz-people-search-'+width+'.png')});
  }
  assert.equal(await publicRow.locator('.feed-search-person-description').count(),1);checks++;
  await privateRow.locator('.feed-search-person-main').click();await page.waitForURL('**/person.private.long.username');checks++;
  assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,widths:[1440,1024,768,480,390,320],browserErrors:errors,api:'isolated real follow handlers; search presentation fixture'}));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));fixture.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
