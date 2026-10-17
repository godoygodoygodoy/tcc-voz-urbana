const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});try{
const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
let profile={id:1,name:'Layout Test',username:'layout',email:'test@example.com',role:'usuario',avatar:''};
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
await page.route('**/api/**',r=>{const u=new URL(r.request().url());if(u.pathname.endsWith('/users/me')){if(r.request().method()==='PUT')profile={...profile,avatar:'/uploads/profiles/saved-avatar.png',fotoPerfil:'/uploads/profiles/saved-avatar.png'};return r.fulfill({json:profile})}return r.fulfill({json:[]})});
await page.route('**/uploads/profiles/saved-avatar.png',r=>r.fulfill({contentType:'image/png',body:png}));
const base='http://127.0.0.1:4173/tecti/2026/gpec03';
await page.goto(base+'/feed');
const cases=[['English','en','Recent reports','THE CITY','Forgot password','New password','Conversations','Search'],['Espa\u00f1ol','es','Identificaciones recientes','LA CIUDAD','Olvid\u00e9 mi contrase\u00f1a','Nueva contrase\u00f1a','Conversaciones','Buscar'],['Portugu\u00eas (Brasil)','pt-BR','Identifica\u00e7\u00f5es recentes','A CIDADE','Esqueci minha senha','Nova senha','Conversas','Pesquisar']];
let checks=0;
for(const [label,lang,feed,hero,forgot,reset,conversations,search] of cases){
 await page.goto(base+'/feed');await page.locator('.access-menu-trigger').click();await page.getByRole('button',{name:label,exact:true}).click();await page.waitForFunction(x=>document.documentElement.lang===x,lang);await page.locator('.feed-title').filter({hasText:feed}).waitFor();checks++;
 await page.locator('.feed-rail button').filter({hasText:conversations}).click();assert.equal(await page.locator('.feed-title').textContent(),conversations);checks++;
 await page.locator('.feed-rail button').filter({hasText:search}).click();assert.equal(await page.locator('.feed-title').textContent(),search);checks++;
 for(const [route,selector,expected] of [['/','#urban-hero-title',hero],['/forgot-password','h1',forgot],['/reset-password?token=fixture','h1',reset]]){await page.goto(base+route);await page.locator(selector).filter({hasText:expected}).waitFor();checks++;}
 await page.reload();await page.waitForFunction(x=>document.documentElement.lang===x,lang);checks++;
}
await page.evaluate(user=>{localStorage.setItem('user',JSON.stringify(user));localStorage.setItem('token','fixture')},profile);
await page.goto(base+'/profile');await page.locator('input[type=file]').setInputFiles({name:'avatar.png',mimeType:'image/png',buffer:png});await page.locator('button[type=submit]').click();await page.locator('.access-menu-trigger img').waitFor();assert.match(await page.locator('.access-menu-trigger img').getAttribute('src'),/saved-avatar/);await page.reload();await page.locator('.access-menu-trigger img').waitFor();assert.match(await page.locator('.access-menu-trigger img').getAttribute('src'),/saved-avatar/);await page.waitForFunction(()=>{const img=document.querySelector('.access-menu-trigger img');return img.complete&&img.naturalWidth>0});checks++;
console.log(JSON.stringify({checks,languageSwitchAndReload:'passed',avatarSaveAndReload:'passed',api:'fixtures'}));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});

