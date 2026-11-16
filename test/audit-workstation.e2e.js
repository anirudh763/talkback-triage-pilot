'use strict';
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const out = process.env.AUDIT_OUT || '/tmp/cuereport-audit';
fs.mkdirSync(out,{recursive:true});
const root=path.resolve(__dirname,'../docs');
const server=http.createServer((req,res)=>{const file=path.join(root,req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0]); if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.html')?'text/html':'application/octet-stream');fs.createReadStream(file).pipe(res);});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port+'/';const b=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});const results=[];try{
 async function check(name,fn){const c=await b.newContext({viewport:{width:1440,height:900},permissions:['clipboard-read','clipboard-write']});const p=await c.newPage();try{await p.goto(base+'#/check');await p.locator('#checklist li').first().waitFor();await fn(p);results.push({name,pass:true});}catch(e){results.push({name,pass:false,error:e.message});}finally{await c.close();}}
 for(const optional of [false,true])await check('final repair optional '+optional,async p=>{await p.locator('#in-body').fill('1. Turn on TalkBack\n2. Open the Post list screen\n3. Swipe right\nApp version: 24.8\nDevice: Pixel 8\nAndroid 14');await p.locator('#gap-expectedActual').waitFor();if(optional)await p.locator('.gaps-opt summary').click();await p.locator('#gap-expectedActual').fill('Expected: Save.\nActual: Button.');await p.locator('#gap-expectedActual').locator('..').getByRole('button',{name:'Add to report'}).click();assert.equal(await p.evaluate(()=>document.activeElement.id),'btn-review');assert.match(await p.locator('#chk-score').innerText(),/6 of 6/);await p.screenshot({path:path.join(out,'repair-'+optional+'.png')});});
 await check('research focus',async p=>{await p.goto(base+'#/research');const open=p.getByRole('button',{name:/Details for/}).first();const name=await open.getAttribute('aria-label');await open.click();await p.locator('#detail button').click();await p.waitForFunction(label=>document.activeElement.getAttribute('aria-label')===label,name);await p.goto(base+'#/research/labels');for(const label of ['Skip','Previous']){await p.getByRole('button',{name:label,exact:true}).click();await p.waitForFunction(()=>document.activeElement.tagName==='H2');}});
 await check('current export',async p=>{await p.locator('#btn-review').click();await p.locator('#btn-copy-tpl').click();await p.waitForFunction(()=>document.querySelector('#copy-tpl-status').textContent.includes('copied'));const a=await p.evaluate(()=>navigator.clipboard.readText());await p.goto(base+'#/check');await p.locator('#in-title').fill('Changed after copy');await p.locator('#btn-review').click();assert.equal(await p.locator('#copy-tpl-status').innerText(),'');await p.locator('#btn-copy-tpl').click();await p.waitForFunction(()=>document.querySelector('#copy-tpl-status').textContent.includes('copied'));const text=await p.evaluate(()=>navigator.clipboard.readText());assert.notEqual(a,text);assert.match(text,/Changed after copy/);const download=p.waitForEvent('download');await p.locator('#btn-dl-tpl').click();const d=await download;assert.equal(fs.readFileSync(await d.path(),'utf8'),text);});
 await check('late clipboard confirmation',async p=>{await p.evaluate(()=>{window.finishCopy=null;navigator.clipboard.writeText=()=>new Promise(resolve=>{window.finishCopy=resolve;});});await p.locator('#btn-review').click();await p.locator('#btn-copy-tpl').click();await p.goto(base+'#/check');await p.locator('#in-title').fill('New revision while copying');await p.evaluate(()=>window.finishCopy());await p.locator('#btn-review').click();await p.waitForFunction(()=>document.querySelector('#tpl').textContent.includes('New revision while copying'));assert.equal(await p.locator('#copy-tpl-status').innerText(),'');assert.match(await p.locator('#tpl').innerText(),/New revision while copying/);});
 await check('nonstream import refuses buffering',async p=>{await p.evaluate(()=>{window.unboundedRead=false;window.fetch=async()=>({ok:true,status:200,headers:new Headers(),body:null,text:async()=>{window.unboundedRead=true;return '{}';}});});await p.locator('.github-import summary').click();await p.locator('#github-issue-url').fill('https://github.com/example/app/issues/1');await p.locator('#btn-import-issue').click();await p.waitForFunction(()=>document.querySelector('#import-status').textContent.includes('cannot safely stream'));assert.equal(await p.evaluate(()=>window.unboundedRead),false);});
 await check('two pane editor and contextual review layout',async p=>{const editor=await p.locator('#in-body').boundingBox(),checks=await p.locator('.review-margin').boundingBox(),draft=await p.locator('#inline-draft').boundingBox();assert.ok(editor&&checks&&draft);assert.ok(editor.x<checks.x&&Math.abs(checks.x-draft.x)<2);assert.ok(checks.y<900&&draft.y>=checks.y+checks.height);await p.screenshot({path:path.join(out,'desktop.png'),fullPage:true});});
 if(process.env.AUDIT_MATRIX) {
 const axe=fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8');
 for(const theme of ['light','dark'])for(const viewport of [{width:1440,height:900},{width:375,height:812}]){
  const c=await b.newContext({viewport});await c.addInitScript(t=>localStorage.setItem('tbt-theme',t),theme);const p=await c.newPage();const events=[];
  p.on('pageerror',e=>events.push(e.message));p.on('console',m=>{if(m.type()==='error')events.push(m.text());});p.on('requestfailed',r=>events.push(r.url()+': '+r.failure().errorText));
  for(const route of ['check','draft','examples','research','research/labels','research/methods','','404-test','404-test/details']){
   await p.goto(base+'#/'+route);await p.locator('main h1:visible').waitFor();await p.evaluate(()=>document.fonts.ready);await p.evaluate(axe);
   const ax=await p.evaluate(()=>axe.run());const key=(route||'root').replaceAll('/','-')+'-'+theme+'-'+viewport.width;
   fs.writeFileSync(path.join(out,key+'.axe.json'),JSON.stringify(ax));
   const overflow=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
   results.push({name:key,pass:ax.violations.filter(v=>['serious','critical'].includes(v.impact)).length===0&&overflow<=0,violations:ax.violations.map(v=>v.id),incomplete:ax.incomplete.map(v=>v.id),overflow});
   if(['check','draft'].includes(route))await p.screenshot({path:path.join(out,key+'.png'),fullPage:true});
  }
  for(const route of ['check','draft','research/labels']){
   await p.goto(base+'#/'+route);await p.locator('main h1:visible').waitFor();await p.evaluate(()=>document.documentElement.style.fontSize='200%');
   const overflow=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);results.push({name:'text200-'+route+'-'+theme+'-'+viewport.width,pass:overflow<=0,overflow});
   await p.screenshot({path:path.join(out,'text200-'+route.replaceAll('/','-')+'-'+theme+'-'+viewport.width+'.png'),fullPage:true});
  }
  await p.emulateMedia({reducedMotion:'reduce',forcedColors:'active'});await p.goto(base+'#/check');await p.screenshot({path:path.join(out,'forced-'+theme+'-'+viewport.width+'.png'),fullPage:true});
  results.push({name:'console-network-'+theme+'-'+viewport.width,pass:events.length===0,events});await c.close();
 }
 }
}finally{await b.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));if(results.some(r=>!r.pass))process.exitCode=1;}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
