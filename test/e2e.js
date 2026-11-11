// End-to-end browser test of docs/index.html with a fake AI and a fake shared store, served over http so
// browser storage works. Covers: the owner running a pilot and labelling, a guest who can't save to the
// shared store (their labels must survive a reload), and the standalone page (GitHub Pages) on a phone in dark mode.
// Needs Playwright: npm install && npx playwright install chromium && npm run test:e2e
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path'); const http = require('http');
const built = fs.readFileSync(path.join(__dirname, '../docs/index.html'), 'utf8');
const mock = (mode) => `<script>
window.__calls=0;
const mockDb=(readOnly)=>{const S=new Map();const L=[];const notify=()=>L.forEach(f=>f());
 const parent=p=>p.split('/').slice(0,-1).join('/');
 const snapDoc=(p)=>({id:p.split('/').pop(),exists:S.has(p),data:()=>S.get(p),metadata:{fromCache:false,hasPendingWrites:false}});
 const deny=()=>Promise.reject({code:'invalid_argument',message:'below minimum level'});
 const doc=(p)=>({id:p.split('/').pop(),path:p,get:async()=>snapDoc(p),set:async(d)=>{if(readOnly)return deny();S.set(p,JSON.parse(JSON.stringify(d)));setTimeout(notify,5)},update:async(d)=>{if(readOnly)return deny();if(!S.has(p))throw{code:'invalid_argument'};S.set(p,Object.assign({},S.get(p),d));setTimeout(notify,5)},delete:async()=>{if(readOnly)return deny();S.delete(p);setTimeout(notify,5)},onSnapshot:(n)=>{const f=()=>n(snapDoc(p));L.push(f);setTimeout(f,5);return()=>{}}});
 const coll=(c,ord)=>({path:c,doc:(id)=>doc(c+'/'+id),orderBy:(f,d)=>coll(c,[f,d]),limit:()=>coll(c,ord),get:async()=>q(c,ord),onSnapshot:(n)=>{const f=()=>n(q(c,ord));L.push(f);setTimeout(f,5);return()=>{}}});
 const q=(c,ord)=>{let docs=[...S.keys()].filter(k=>parent(k)===c).map(snapDoc);if(ord){docs.sort((a,b)=>String(a.data()[ord[0]]).localeCompare(String(b.data()[ord[0]]))*(ord[1]==='desc'?-1:1))}return{docs,size:docs.length,empty:!docs.length,docChanges:()=>[],metadata:{fromCache:false,hasPendingWrites:false}}};
 window.__S=S; return {doc,collection:(c)=>coll(c)}};
const MODE='${mode}';
if(MODE!=='none'){const DB=mockDb(MODE==='guest');
window.claude={use:async(n)=>{
 if(n==='sample'){const f=async(input,opts)=>{window.__calls++;await new Promise(r=>setTimeout(r,10));
   const body=(input.split('<<<')[1]||'');const steps=/\\n\\s*(\\d+[.)]|-)\\s/.test(body);const ver=/\\d+\\.\\d+/.test(body);
   const a={task_impact:/crash|can't|cannot|unable|skips/i.test(input)?'blocks_task':'slows_task',evidence:steps?'actionable':'needs_more_evidence',missing:[...(steps?[]:['talkback_steps']),...(ver?[]:['app_version'])],reason:'Mock reason.',ask_reporter:steps?'':'What steps did you take with TalkBack on?'};
   return{text:JSON.stringify(a),truncated:false,modelTierApplied:opts.modelTier}};return f}
 if(n==='user')return{me:async()=>({id:MODE==='guest'?'u_guest':'u_me',name:MODE==='guest'?'Guest':'Anirudh',isOwner:MODE!=='guest'}),profiles:async(ids)=>Object.fromEntries([].concat(ids).map(i=>[i,{id:i,name:''}])),isOwner:async()=>MODE!=='guest'};
 if(n==='db')return DB;
 return null}};}
</script>`;
const wrap = (mode) => built.replace('<head>', '<head>' + mock(mode));
const server = http.createServer((req, res) => { const mode = (req.url.match(/mode=(\w+)/) || [, 'owner'])[1]; res.writeHead(200, { 'content-type': 'text/html' }); res.end(wrap(mode)); });
(async () => {
  await new Promise((r) => server.listen(0, r));
  const base = 'http://127.0.0.1:' + server.address().port + '/?mode=';
  const browser = await chromium.launch();
  const errors = [];
  const watch = (page, tag) => { page.on('pageerror', (e) => errors.push(tag + ' pageerror: ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(tag + ' console: ' + m.text()); }); };
  const block = async (ctx) => { await ctx.route('https://fonts.googleapis.com/**', r => r.abort()); await ctx.route('https://fonts.gstatic.com/**', r => r.abort()); };

  // ---- owner ----
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } }); await block(ctx);
    const page = await ctx.newPage(); watch(page, 'owner');
    await page.goto(base + 'owner'); await page.waitForTimeout(300);
    console.log('[owner] checklist:', await page.textContent('#chk-score'));
    await page.click('#btn-compare'); await page.waitForFunction(() => document.querySelectorAll('.verdict').length === 2);
    console.log('[owner] compare:', await page.textContent('#triage-status'), '| struck lines:', await page.locator('.report .gone').count(), '| confidence shown:', await page.locator('text=Confidence').count());
    await page.screenshot({ path: path.join(__dirname, 'shot-check.png'), fullPage: true });
    await page.click('#tab-pilot');
    await page.locator('#cond-opts input[value=no_steps]').check(); await page.locator('#cond-opts input[value=no_version]').check();
    console.log('[owner] planned:', await page.textContent('#run-calls'));
    await page.click('#btn-run');
    await page.waitForFunction(() => /Finished/.test(document.querySelector('#run-status').textContent), null, { timeout: 60000 });
    console.log('[owner] run:', await page.textContent('#run-status'));
    console.log('[owner] finding:', (await page.textContent('#results')).match(/Exploratory[^.]*\.[^.]*\./)?.[0]);
    console.log('[owner] method saved:', await page.evaluate(() => [...window.__S.entries()].filter(([k]) => /^runs\/[^/]+$/.test(k)).map(([, v]) => v.method + '/' + v.status).join(',')));
    await page.screenshot({ path: path.join(__dirname, 'shot-pilot.png'), fullPage: false });
    await page.click('#tab-label');
    console.log('[owner] label set default:', await page.inputValue('#lab-set'), '| first report:', await page.textContent('#lab-card h3'));
    for (let i = 0; i < 2; i++) { await page.check('input[name=lab-evid][value=actionable]'); await page.check('input[name=lab-impact][value=blocks_task]'); await page.click('text=Save and next'); await page.waitForTimeout(80); }
    console.log('[owner] where:', await page.textContent('#lab-where'));
    await page.selectOption('#lab-cond', 'no_steps'); await page.waitForTimeout(50);
    console.log('[owner] no_steps version shows struck/removed text?', await page.locator('#lab-card .report').textContent().then(t => /Steps to reproduce/.test(t)));
    await page.check('input[name=lab-evid][value=needs_more_evidence]'); await page.check('input[name=lab-impact][value=blocks_task]'); await page.click('text=Save and next'); await page.waitForTimeout(80);
    const imp = JSON.stringify({ labels: { 'WP-20770': { impact: 'blocks_task', evidence: 'actionable' }, 'WP-20150': { impact: 'slows_task', evidence: 'actionable' }, 'WP-20770~no_steps': { impact: 'blocks_task', evidence: 'needs_more_evidence' } } });
    await page.fill('#imp-name', 'Second rater'); await page.fill('#imp-json', imp); await page.click('#btn-import'); await page.waitForTimeout(150);
    console.log('[owner] import:', await page.textContent('#lab-status'));
    console.log('[owner] agree:', (await page.textContent('#lab-agree')).replace(/\s+/g, ' ').slice(0, 220));
    await page.click('#tab-pilot'); await page.waitForTimeout(100);
    const agreeTable = await page.locator('caption:has-text("same version")').locator('xpath=..').textContent().catch(() => 'MISSING');
    for (const v of ['check', 'pilot', 'label', 'about']) { await page.click('#tab-' + v); if (await page.evaluate(() => document.body.innerText.split('\n').some((l) => l.trim() === 'null'))) errors.push('stray "null" text on the ' + v + ' tab'); }
    console.log('[owner] agreement table:', agreeTable.replace(/\s+/g, ' ').slice(0, 300));
    await ctx.close();
  }

  // ---- guest: can read but not write the page's store; labels must survive a reload ----
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] }); await block(ctx);
    const page = await ctx.newPage(); watch(page, 'guest');
    await page.goto(base + 'guest#label'); await page.waitForTimeout(300);
    await page.check('input[name=lab-evid][value=actionable]'); await page.check('input[name=lab-impact][value=slows_task]'); await page.click('text=Save and next'); await page.waitForTimeout(150);
    if (await page.evaluate(() => document.body.innerText.split('\n').some((l) => l.trim() === 'null'))) errors.push('stray "null" text on the guest label tab');
    console.log('[guest] after save:', await page.textContent('#lab-where'));
    await page.reload(); await page.waitForTimeout(300);
    await page.click('#btn-copy-labels'); await page.waitForTimeout(100);
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    console.log('[guest] after reload, copied:', clip.slice(0, 160), '| status:', await page.textContent('#lab-status'));
    await ctx.close();
  }

  // ---- standalone file (no Claude) and phone + dark ----
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' }); await block(ctx);
    const page = await ctx.newPage(); watch(page, 'standalone');
    await page.goto(base + 'none'); await page.waitForTimeout(400);
    console.log('[standalone] overflow px:', await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth));
    await page.screenshot({ path: path.join(__dirname, 'shot-mobile-dark.png') });
    await page.click('#tab-pilot'); await page.waitForTimeout(100);
    console.log('[standalone] results:', (await page.textContent('#results')).slice(0, 120));
    await page.click('#tab-label'); await page.waitForTimeout(100);
    console.log('[standalone] label overflow px:', await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth));
    await page.screenshot({ path: path.join(__dirname, 'shot-mobile-label.png') });
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log('\nERRORS:', errors.length ? errors.join('\n') : 'none');
  process.exitCode = errors.length ? 1 : 0;
})();
