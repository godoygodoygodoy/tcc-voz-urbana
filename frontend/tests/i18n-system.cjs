const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const catalog = require('../src/locales/interface.json');
const base = process.env.I18N_TEST_URL || 'http://127.0.0.1:4173/tecti/2026/gpec03';
(async () => {
 const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const errors = [], failures = []; let checks=0;
 try {
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*', r => new URL(r.request().url()).origin === new URL(base).origin ? r.continue() : r.abort());
  let role='admin';
  const user=()=>({id:1,name:'Fixture Person',nome:'Fixture Person',username:'fixture',email:'fixture@example.com',role,joinedAt:'2026-01-01',publicationCount:1,publications:[post]});
  const post={id:1,title:'Texto do morador preservado',description:'Descrição do morador preservada',status:'ABERTO',category:{id:1,name:'Iluminação'},author:{id:1,name:'Fixture Person',username:'fixture'},createdAt:'2026-11-10T12:00:00Z',images:[],updates:[],votes:1,latitude:-23.5,longitude:-46.6};
  await page.route('**/api/**',r=>{const p=new URL(r.request().url()).pathname;let data=[];
   if(p.endsWith('/users/me'))data=user();
   else if(p.endsWith('/common-connections'))data={followers:{data:[],total:0,page:1,limit:4},following:{data:[],total:0,page:1,limit:4}};
   else if(p.endsWith('/categories'))data=[{id:1,name:'Iluminação'}];
   else if(p.endsWith('/admin/stats'))data={totalUsers:1,totalProblems:1,openProblems:1,byCategory:[{category:'Iluminação',total:1}],usersByDay:[{date:'2026-11-10',total:1}]};
   else if(p.endsWith('/admin/logs'))data={items:[{id:1,acao:'Publicação 5 excluída no painel administrativo',data:'2026-11-10'}]};
   else if(p.endsWith('/admin/system'))data={database:'Conectado',backend:'Operacional',metrics:'Não disponível sem coletor de erros.'};
   else if(p.endsWith('/admin/users'))data=[{...user(),dataCriacao:'2026-01-01'}];
   else if(p.endsWith('/admin/problems'))data=[post];
   else if(p.endsWith('/problems/1'))data=post;
   else if(p.endsWith('/problems'))data={data:[post],total:1};
   else if(p.endsWith('/notifications'))data=[{id:1,titulo:'Novo comentário',mensagem:'Fixture Person comentou no seu problema',dataCriacao:'2026-11-10'}];
   else if(p.endsWith('/profile'))data=user();
   else if(p.endsWith('/friendship'))data={status:'NONE'};
   return r.fulfill({json:data});
  });
  async function go(route){await page.goto(base+route,{waitUntil:'domcontentloaded'});await page.locator('.access-menu-trigger').waitFor();await page.waitForTimeout(200);}
  async function scan(label,lang){if(lang==='pt-BR')return;
   const forbidden=Object.entries(catalog['pt-BR']).filter(([key,pt])=>catalog[lang][key]!==pt && pt.length>2 && !Object.values(catalog[lang]).includes(pt)).map(([,pt])=>pt);
   const found=await page.evaluate(words=>{const out=[];const set=new Set(words);const walk=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while(n=walk.nextNode()){if(n.parentElement?.closest('script,style'))continue;if(n.parentElement?.getClientRects().length&&set.has(n.textContent.trim()))out.push(n.textContent.trim());}for(const el of document.querySelectorAll('[placeholder],[aria-label],[title]'))if(el.getClientRects().length)for(const a of ['placeholder','aria-label','title'])if(set.has(el.getAttribute(a)))out.push(el.getAttribute(a));return [...new Set(out)]},forbidden);
   if(found.length)failures.push({label,lang,found}); checks++;
  }
  for(const lang of ['en','es','pt-BR']){
   console.log('Testing '+lang);
   await go('/feed');await page.evaluate(({lang,user})=>{localStorage.setItem('language',lang);localStorage.setItem('user',JSON.stringify(user));localStorage.setItem('token','fixture');localStorage.setItem('voz-urbana-christmas-unlocked','true');localStorage.setItem('voz-urbana-site-theme','christmas');},{lang,user:user()});
   await go('/feed');
   // Switch using the real language controls, without navigation or reload.
   await page.locator('.access-menu-trigger').click();
   await page.locator('.access-menu button').filter({hasText:lang==='en'?/^English/:lang==='es'?/^Español/:/^Português/}).click();
   assert.equal(await page.locator('html').getAttribute('lang'),lang);assert.equal(await page.title(),catalog[lang].documentTitle);checks+=2;
   for(const route of ['/','/map','/feed','/feed#conversations','/feed#search','/feed#notifications','/feed#saved','/feed#create','/profile','/fixture','/problem/1','/admin']){await go(route);await scan(route,lang);}
   await page.locator('.site-menu-trigger').click();
   const links=page.locator('.site-menu-link');assert.equal(await links.count(),8);
   assert.match(await links.nth(6).getAttribute('class'),/site-menu-create/);assert.match(await links.nth(7).getAttribute('class'),/site-menu-admin/);
   assert.deepEqual(await links.locator('.site-menu-link-index').allTextContents(),['01','02','03','04','05','06','07','08']);checks+=3;
   await scan('menu',lang);await page.locator('.site-menu-trigger').click();
   for(const key of ['Usuários','Publicações','Problemas urbanos','Estatísticas','Auditoria','Monitoramento']){await page.getByRole('button',{name:catalog[lang][key],exact:true}).evaluate(el=>el.scrollIntoView({block:'center'}));await page.getByRole('button',{name:catalog[lang][key],exact:true}).click();await page.waitForTimeout(100);await scan('admin '+key,lang);}
   // Existing content must remain exactly as authored.
   await go('/problem/1');await page.getByText(post.title,{exact:true}).waitFor();await page.getByText(post.description,{exact:true}).waitFor();checks+=2;
   role='usuario';await page.evaluate(u=>localStorage.setItem('user',JSON.stringify(u)),user());await go('/admin');assert.equal(new URL(page.url()).pathname, new URL(base+'/').pathname);checks++;
   await page.locator('.site-menu-trigger').click();assert.equal(await page.locator('.site-menu-admin').count(),0);assert.equal(await page.locator('.site-menu-create').count(),1);checks+=2;
   await page.evaluate(()=>{localStorage.removeItem('token');localStorage.removeItem('user');});
   for(const route of ['/login','/register','/forgot-password','/reset-password?token=fixture']){await go(route);await scan(route,lang);}
   await go('/forgot-password');
   const validation = await page.locator('input[type=email]').evaluate(el => { el.value='invalid'; el.reportValidity(); return el.validationMessage; });
   assert.equal(validation,catalog[lang].invalidEmail);checks++;
   role='admin';
  }
  // Live switching in a populated admin dashboard catches stale memoized labels.
  await page.evaluate(u=>{localStorage.setItem('user',JSON.stringify(u));localStorage.setItem('token','fixture');},user());await go('/admin');
  for(const lang of ['en','es','pt-BR']){await page.locator('.access-menu-trigger').click();await page.locator('.access-menu button').filter({hasText:lang==='en'?/^English/:lang==='es'?/^Español/:/^Português/}).click();await scan('live admin',lang);assert.equal(await page.locator('html').getAttribute('lang'),lang);checks++;await page.reload();assert.equal(await page.locator('html').getAttribute('lang'),lang);checks++;}
  await go('/profile');
  await page.locator('input[type=file]').first().setInputFiles({name:'invalid.txt',mimeType:'text/plain',buffer:Buffer.from('fixture')});
  await page.locator('.Toastify__toast-body').waitFor();
  await page.locator('.access-menu-trigger').click();
  for(const [lang,label] of [['en',/^English/],['es',/^Español/],['pt-BR',/^Português/]]) {
   await page.locator('.access-menu button').filter({hasText:label}).click();
   assert.match(await page.locator('.Toastify__toast-body').textContent(),new RegExp(catalog[lang]['Selecione um arquivo de imagem válido.']));checks++;
  }
  await go('/admin');
  await page.locator('.site-menu-trigger').click();
  const colors=await page.locator('.site-menu-create,.site-menu-admin').evaluateAll(elements=>elements.map(el=>({background:getComputedStyle(el).backgroundImage,border:getComputedStyle(el).borderColor})));
  assert.notDeepEqual(colors[0],colors[1]);checks++;
  await page.locator('.site-menu-trigger').click();
  await page.setViewportSize({width:390,height:844});await page.locator('.site-menu-trigger').click();await page.waitForTimeout(250);assert.equal(await page.locator('.site-menu-admin').count(),1);
  const rect=await page.locator('.site-menu-panel').boundingBox();assert.ok(rect.x>=0&&rect.x+rect.width<=390,JSON.stringify(rect));checks+=2;
  const screenshot=require('node:path').join(require('node:os').tmpdir(),'voz-urbana-i18n-menu.png');
  await page.screenshot({path:screenshot});console.log('Menu screenshot: '+screenshot);
  await page.evaluate(()=>localStorage.setItem('voz-urbana-site-theme','normal'));
  await page.reload();await page.locator('.site-menu-trigger').click();await page.waitForTimeout(250);
  const normalScreenshot=require('node:path').join(require('node:os').tmpdir(),'voz-urbana-i18n-menu-normal.png');
  await page.screenshot({path:normalScreenshot});console.log('Normal menu screenshot: '+normalScreenshot);
  assert.equal(await page.locator('html').getAttribute('data-site-theme'),'normal');checks++;
  assert.deepEqual(errors,[],'Browser runtime errors');assert.deepEqual(failures,[],'Untranslated interface text');
  console.log(JSON.stringify({checks,languages:3,browserErrors:errors,fixtures:true}));
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
