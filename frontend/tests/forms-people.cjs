const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({headless:true, channel:'msedge'});
  try {
    const page = await browser.newPage({viewport:{width:1366,height:900}});
    let failSearch = false;
    await page.route('**/api/**', route => {
      const url = new URL(route.request().url());
      let body = [];
      if (url.pathname.endsWith('/users/search')) {
        if (failSearch) return route.fulfill({status:503,json:{error:'Temporarily unavailable'}});
        const second = url.searchParams.get('page') === '2';
        body = {total:13,page:second?2:1,limit:12,data:second?[{id:'last',nome:'Pessoa Última',username:'ultima',fotoPerfil:null}]:Array.from({length:12},(_,index)=>({id:String(index),nome:'Pessoa Nova '+index,username:'nova_'+index,fotoPerfil:null}))};
      } else if (url.pathname.endsWith('/users/me')) return route.fulfill({status:503,json:{error:'Temporarily unavailable'}});
      else if (url.pathname.endsWith('/problems')) body={data:[],total:0};
      else if (url.pathname.endsWith('/categories')) body=[{id:'1',name:'Asfalto'}];
      return route.fulfill({status:200,json:body});
    });
    await page.goto((process.env.TEST_BASE_URL || 'http://127.0.0.1:5179') + '/tecti/2026/gpec03/feed#search');
    const search=page.locator('.feed-discovery-search input');await search.waitFor();
    await page.evaluate(()=>{
      const fixtures=document.createElement('div');fixtures.id='form-fixtures';
      fixtures.innerHTML='<label class="feed-search"><input aria-label="Search fixture"></label><form class="feed-dm-compose"><input aria-label="Message fixture"></form><form class="feed-create-form"><input><textarea></textarea><select><option>Option</option></select></form><input class="site-form-input">';
      document.body.append(fixtures);
    });
    for(const theme of ['normal','christmas']) {
      await page.evaluate(async theme=>{const m=await import('/tecti/2026/gpec03/src/utils/christmasTheme.js');localStorage.setItem('voz-urbana-christmas-unlocked','true');m.applySiteTheme(theme);},theme);
      await page.waitForTimeout(400);
      for(const selector of ['.feed-discovery-search input','#form-fixtures .feed-search input','#form-fixtures .feed-dm-compose input']) {
        const input=page.locator(selector);await input.focus();await page.waitForTimeout(300);
        const computed=await input.evaluate(el=>({bg:getComputedStyle(el).backgroundColor,shadow:getComputedStyle(el).boxShadow}));
        assert.equal(computed.bg,'rgba(0, 0, 0, 0)',theme+' '+selector);
        assert.equal(computed.shadow,'none',theme+' '+selector);
      }
    }
    await search.fill('@nova');
    await page.getByText('Pessoa Nova 0',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Próxima',exact:true}).click();
    await page.getByText('Pessoa Última',{exact:true}).waitFor();
    assert.match(await page.getByRole('link').filter({hasText:'Pessoa Última'}).getAttribute('href'),/ultima/);
    failSearch=true;await search.fill('failed-query');
    await page.locator('.feed-search-empty[role=alert]').waitFor();
    await page.evaluate(()=>{localStorage.setItem('token','test-session');localStorage.setItem('user',JSON.stringify({id:'test',name:'Test'}));});
    await page.reload();await page.waitForTimeout(700);
    assert.equal(await page.evaluate(()=>localStorage.getItem('token')),'test-session');
    console.log('PASS: transparent compound fields in both themes, public people results/pagination/profile link, explicit query error and session preserved on API 503.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
