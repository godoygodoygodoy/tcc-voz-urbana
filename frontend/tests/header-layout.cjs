const { chromium } = require('playwright');
const fs = require('node:fs');
(async () => {
 const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
 const routes = ['/', '/#como', '/#sobre', '/#contato', '/contato', '/map', '/feed', '/login', '/forgot-password', '/reset-password?token=fixture', '/register', '/problem/1', '/report', '/profile', '/admin', '/inexistente'];
 const sizes = [[320,740],[390,844],[768,1024],[1440,900],[900,1440]];
 const results = []; const errors = [];
 await Promise.all(['visitor','user','admin'].map(async role => {
  const context = await browser.newContext({reducedMotion:'reduce'});
  await context.addInitScript(role => { localStorage.clear(); if(role !== 'visitor') {localStorage.setItem('user',JSON.stringify({id:1,name:'Layout Test',username:'layout',role})); localStorage.setItem('token','layout-fixture');}}, role);
  await context.route('**/api/**', route => {const path = new URL(route.request().url()).pathname; let data = []; if(path.endsWith('/problems/1')) data={id:1,titulo:'Teste de layout',descricao:'Conteúdo local para verificar o cabeçalho.',status:'open',createdAt:'2026-10-01',created_at:'2026-10-01',latitude:-23,longitude:-46,images:[], fotos:[]}; else if(path.includes('/stats')) data={}; else if(path.endsWith('/me')) data={id:1,name:'Layout Test',username:'layout',role}; return route.fulfill({json:data}); });
  const page = await context.newPage();
  for (const [width,height] of sizes) for (const zoom of [1,2]) {
   await page.setViewportSize({width:Math.floor(width/zoom),height:Math.floor(height/zoom)});
   for(const route of routes) {
    await page.goto('http://127.0.0.1:4173/tecti/2026/gpec03'+route, {waitUntil:'domcontentloaded'});
    await page.locator('.site-header-brand').waitFor({state:'attached'});
    await page.waitForTimeout(100);
    for(const scroll of [0,400]) for(const open of [false,true]) {
     await page.evaluate(y => {window.scrollTo(0,y)},scroll);
     await page.waitForTimeout(30);
     const trigger = page.locator('.site-menu-trigger');
     if((await trigger.getAttribute('aria-expanded')) !== String(open)) await trigger.click({force:true});
     const check = await page.evaluate(() => {const rect=s=>document.querySelector(s)?.getBoundingClientRect(); const m=rect('.site-menu-trigger'),b=rect('.site-header-brand'),h=rect('.site-header'), rail=rect('.feed-rail'), rb=rect('.feed-brand'); const imgs=[...document.querySelectorAll('.site-header-brand img')].map(x=>x.getBoundingClientRect());return {gap:b.left-m.right,menuTop:m.top,compact:document.querySelector('.site-header').dataset.compact,hitSafe:!!document.elementFromPoint(m.left+m.width/2,m.top+m.height/2)?.closest('.site-menu-trigger'),imagesSafe:imgs.every(i=>i.left>=m.right+15&&i.right<=b.right+1),actualScroll:window.scrollY,railSafe:!rb||!rail.width||rb.top>=h.bottom-1,headerCount:document.querySelectorAll('header').length};});
     const item={role,width,height,zoom,route,scroll,open,...check}; results.push(item);
     if(check.gap<15||!check.imagesSafe||!check.railSafe||check.headerCount!==1||check.menuTop<0||!check.hitSafe) errors.push(item);
    }
   }
   console.log(role,width,height,'zoom',zoom,'checks',results.length,'failures',errors.length);
  }
  await context.close();
 }));
 fs.writeFileSync('frontend/tests/header-layout-results.json',JSON.stringify({zoomMethod:'200% reflow simulated by halving CSS viewport dimensions',api:'local fixtures; no real login/backend',checks:results.length,errors,routes,sizes},null,2));
 await browser.close(); if(errors.length) process.exitCode=1;
})();

