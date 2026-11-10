const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try {
  const page=await browser.newPage();
  await page.addInitScript(()=>{localStorage.setItem('voz-urbana-christmas-unlocked','true');localStorage.setItem('voz-urbana-site-theme','christmas');});
  await page.goto('http://127.0.0.1:5178/tecti/2026/gpec03/');
  for(const width of [1904,1366,390]) {
   await page.setViewportSize({width,height:900});
   for(const id of ['como','mapa','sobre']) {
    const section=page.locator('#'+id);
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    const bounds=await section.evaluate(el=>{
     const section=el.getBoundingClientRect(), garland=el.querySelector(':scope > .christmas-garland').getBoundingClientRect();
     return {left:section.left,right:section.right,garlandLeft:garland.left,garlandRight:garland.right};
    });
    assert.ok(Math.abs(bounds.left-bounds.garlandLeft)<1,JSON.stringify({width,id,bounds}));
    assert.ok(Math.abs(bounds.right-bounds.garlandRight)<1,JSON.stringify({width,id,bounds}));
   }
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  console.log('PASS: garlands reach both edges of como/mapa/sobre at 1904, 1366 and 390px without horizontal overflow');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
