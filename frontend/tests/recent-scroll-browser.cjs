const {chromium}=require('playwright'),assert=require('node:assert/strict');
const base=process.env.SCROLL_TEST_URL||'http://127.0.0.1:4173/tecti/2026/gpec03';
(async()=>{
 const{createSocialFixture}=await import('../../backend/tests/helpers/socialFixture.js');
 const{createMessaging}=await import('../../backend/src/services/messaging.js');
 const f=await createSocialFixture(),conversation=await createMessaging(f.db).open('a','c');
 for(let i=0;i<70;i++)f.state.messages.push({id:'scroll-'+String(i).padStart(4,'0'),conversaId:conversation.id,remetenteId:'c',texto:'Isolated scroll history '+i,criadaEm:new Date(2026,10,1,0,i)});
 const server=f.app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),errors=[],checks=[];
 try{
  const page=await browser.newPage({viewport:{width:1365,height:720},reducedMotion:'no-preference',hasTouch:true});page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{localStorage.setItem('language','en');localStorage.setItem('token','test-a');localStorage.setItem('user',JSON.stringify({id:'a',name:'Person a',username:'person.a',role:'usuario'}));});
  await page.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort());
  await page.route('**/api/**',async route=>{const u=new URL(route.request().url()),response=await route.fetch({url:'http://127.0.0.1:'+server.address().port+u.pathname+u.search,headers:{...route.request().headers(),authorization:'Bearer test-a'}});await route.fulfill({response});});
  const wheel=async(locator,delta)=>{
   const box=await locator.boundingBox();assert.ok(box);
   await page.mouse.move(box.x+box.width-12,box.y+Math.min(100,box.height/2));
   const before=await locator.evaluate(el=>el.scrollTop);await page.mouse.wheel(0,delta);
   await page.waitForTimeout(400);return{before,after:await locator.evaluate(el=>el.scrollTop)};
  };
  await page.goto(base+'/feed');await page.locator('.story-own-add').click();const dialog=page.getByRole('dialog');await dialog.locator('.story-composer-stage').waitFor();
  const initial=await wheel(dialog,400);console.log(JSON.stringify({baselineOrResult:'story editor wheel',...initial}));assert.ok(initial.after>initial.before,'Editor must receive real wheel events while smooth page scrolling is enabled');
  const background=await page.evaluate(()=>scrollY);await wheel(dialog,10000);assert.equal(await page.evaluate(()=>scrollY),background);checks.push('editor native wheel and no background scroll at boundary');
  const publish=dialog.getByRole('button',{name:'Publish story',exact:true});await publish.scrollIntoViewIfNeeded();assert.equal(await publish.isVisible(),true);await page.keyboard.press('Home');await dialog.getByLabel('Close',{exact:true}).click();
  await page.goto(base+'/feed#conversations');const messages=page.locator('.feed-dm-messages');await messages.locator('.feed-message').first().waitFor();const chat=await wheel(messages,-400);assert.ok(chat.after<chat.before,'Chat must scroll its own history');checks.push('chat history scroll');
  await page.setViewportSize({width:844,height:390});
  const checkModal=async label=>{
   const modal=page.getByRole('dialog'),metrics=await modal.evaluate(el=>({height:el.clientHeight,total:el.scrollHeight}));
   if(metrics.total>metrics.height+1){const result=await wheel(modal,400);assert.ok(result.after>result.before,label+' must scroll');}
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await modal.getByLabel('Close',{exact:true}).click();assert.equal(await page.evaluate(()=>document.body.style.overflow),'');checks.push(label+' scroll and unlock');
  };
  await page.getByRole('button',{name:'Create group or channel',exact:true}).click();await page.getByRole('dialog').getByLabel('Conversation name',{exact:true}).waitFor();await checkModal('group creation');
  await page.goto(base+'/feed');await page.getByRole('button',{name:'Create note',exact:true}).click();let modal=page.getByRole('dialog');await modal.getByRole('textbox').fill('Unsaved isolated note');await checkModal('note');
  await page.locator('.feed-post').first().getByRole('button',{name:/Repost in/}).click();await checkModal('repost');
  await page.locator('.feed-post').first().getByRole('button',{name:'Safety and privacy',exact:true}).click();await page.getByRole('dialog').getByLabel('Describe the reason').waitFor();await checkModal('safety and reporting');
  for(const width of [390,844]){
   await page.setViewportSize({width,height:width===390?640:390});await page.locator('.story-own-add').click();modal=page.getByRole('dialog');await modal.locator('canvas').waitFor();
   if(width===390){
    const canvas=modal.locator('canvas');await canvas.scrollIntoViewIfNeeded();
    assert.equal(await canvas.evaluate(el=>getComputedStyle(el).touchAction),'pan-y');
    const touch=await page.context().newCDPSession(page);
    const stroke=async distance=>{
     const box=await canvas.boundingBox(),x=box.x+box.width/2,y=Math.min(box.y+box.height-30,page.viewportSize().height-50);
     await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
     for(let i=1;i<=6;i++){await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-distance*i/6}]});await page.waitForTimeout(40);}
     await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(350);
    };
    const before=await modal.evaluate(el=>el.scrollTop);await stroke(140);assert.ok(await modal.evaluate(el=>el.scrollTop)>before,'Swipe on preview should scroll editor');
    const draw=modal.getByRole('button',{name:'Draw',exact:true});await draw.click();await canvas.scrollIntoViewIfNeeded();
    assert.equal(await canvas.evaluate(el=>getComputedStyle(el).touchAction),'none');
    const original=await canvas.evaluate(el=>el.toDataURL());const drawingScroll=await modal.evaluate(el=>el.scrollTop);await stroke(100);
    assert.equal(await modal.evaluate(el=>el.scrollTop),drawingScroll,'Drawing must not pan the editor');
    await page.waitForFunction(original=>document.querySelector('.story-composer-stage canvas').toDataURL()!==original,original);
    await modal.getByRole('button',{name:'Undo',exact:true}).click();await touch.detach();checks.push('real touch scroll on preview and drawing without page movement');
   }
   if(width===844){
    await modal.getByRole('button',{name:'Media library',exact:true}).click();const library=modal.locator('.story-library');
    await library.locator('.floating-trigger').click();await page.getByRole('option',{name:'Poll',exact:true}).click();
    const size=await library.evaluate(el=>({height:el.clientHeight,total:el.scrollHeight}));
    assert.ok(size.total>size.height,'Short viewport should overflow sticker library');const movement=await wheel(library,120);assert.ok(movement.after>movement.before);checks.push('nested sticker library wheel');
   }
   await modal.getByRole('button',{name:'Publish story',exact:true}).scrollIntoViewIfNeeded();
   const box=await modal.boundingBox();assert.ok(box.y>=-1&&box.y+box.height<=page.viewportSize().height+1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await modal.getByLabel('Close',{exact:true}).click();checks.push('editor reachable controls at '+width+'px');
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,browserErrors:errors,scope:'isolated fixture, smooth scrolling enabled; no production writes'}));
 }finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await f.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
