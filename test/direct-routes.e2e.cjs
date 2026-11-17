'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const docs = path.join(__dirname, '../docs');
const routes = ['/workbench', '/ablation', '/statistics', '/system', '/settings'];
const evidence = process.env.EVIDENCE_DIR || path.join(__dirname, '../../artifacts/verification/product-repair-20261116/cuereport');
fs.mkdirSync(evidence, {recursive:true});
const types = {'.html':'text/html','.woff2':'font/woff2','.ttf':'font/ttf','.js':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml'};
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const file = path.join(docs, routes.includes(url.pathname) ? 'index.html' : url.pathname);
  if (!file.startsWith(docs + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', types[path.extname(file)] || 'text/plain'); fs.createReadStream(file).pipe(res);
});
(async () => {
  let browser;
  try {
    if (!(process.env.CUEREPORT_BASE_URL || process.env.TB_BASE_URL)) await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = (process.env.CUEREPORT_BASE_URL || process.env.TB_BASE_URL) || 'http://127.0.0.1:' + server.address().port;
    browser = await chromium.launch(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {});
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const titles = ['Workbench', 'Step-removal comparison', 'Statistics', 'System', 'Settings'];
    let scans = 0;
    for (const width of [320, 375, 768, 1024, 1440]) {
      await page.setViewportSize({width, height:900});
      for (let i=0;i<routes.length;i++) {
        await page.goto(base + routes[i]);
        const heading = page.locator('main h1:visible');
        await assert.equal(await heading.textContent(), titles[i]);
        await page.reload(); await assert.equal(await heading.textContent(), titles[i]);
        assert.match(await page.title(), new RegExp(titles[i]));
        assert.equal(await page.locator('#rail a[aria-current=page]').count(), 1);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, routes[i] + ' overflow at ' + width);
        await page.evaluate(fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8'));
        const violations = await page.evaluate(async () => (await axe.run(document)).violations.map(v=>v.id));
        assert.deepEqual(violations, [], routes[i] + ' axe at ' + width); scans++;
        await page.screenshot({path:path.join(evidence, ((process.env.CUEREPORT_BASE_URL || process.env.TB_BASE_URL) ? 'direct-live-' : 'direct-') + i + '-' + width + '.png'), fullPage:true});
      }
    }
    for(const route of ['/settings']){
      await page.goto(base+route);
      const local=page.locator('.local-work > summary'); await local.press('Enter');
      await page.getByRole('button',{name:'Encrypted backup',exact:true}).click();
      await page.getByRole('dialog',{name:'Encrypted portable backup'}).waitFor();
      await page.locator('#backup-close').click();
      assert.equal(await page.getByRole('button',{name:'Encrypted backup',exact:true}).evaluate(el=>el===document.activeElement),true);
      await local.press('Escape');
      assert.equal(await page.locator('.local-work').getAttribute('open'),null);
      assert.equal(await local.evaluate(el=>el===document.activeElement),true);
    }
    await page.goto(base+'/workbench');
    await page.locator('#report-options>summary').press('Enter');const collection=page.locator('.report-collection > summary'); await collection.press('Enter'); await collection.press('Escape');
    assert.equal(await page.locator('.report-collection').getAttribute('open'),null);
    assert.equal(await collection.evaluate(el=>el===document.activeElement),true);
    await page.setViewportSize({width:375,height:812}); await page.goto(base+'/workbench'); await page.locator('#btn-menu').click();
    assert.equal(await page.locator('.canonical-nav a:visible').count(),4);
    for(let i=0;i<12;i++){await page.keyboard.press('Tab');assert.equal(await page.locator('#rail').evaluate(el=>el.contains(document.activeElement)),true);}
    await page.keyboard.press('Escape');assert.equal(await page.locator('#btn-menu').getAttribute('aria-expanded'),'false');
    await page.goto(base + '/system');
    if ((process.env.CUEREPORT_BASE_URL || process.env.TB_BASE_URL)) {
      await page.waitForFunction(() => document.querySelector('#system-status').textContent.startsWith('Updated'));
      assert.match(await page.textContent('#system-data'), /cuereport/);
      assert.match(await page.textContent('#system-data'), /requests total/);
      assert.match(await page.textContent('#system-metrics'), /http_requests_total/);
      await page.route('**/metrics', route => route.abort());
      await page.locator('#system-refresh').click();
      await page.waitForFunction(() => document.querySelector('#system-status').textContent.includes('unavailable'));
      assert.match(await page.textContent('#system-data'), /Retry with Refresh/);
      await page.unroute('**/metrics'); await page.locator('#system-refresh').click();
      await page.waitForFunction(() => document.querySelector('#system-status').textContent.startsWith('Updated'));
    } else {
      await page.waitForFunction(() => document.querySelector('#system-status').textContent.includes('unavailable'));
    }
    await page.goto(base + '/ablation?report=WP-20770');
    assert.equal(await page.inputValue('#ablation-report'), 'WP-20770');
    assert.ok(await page.locator('#ablation-diff .gone').count() > 0, 'real removed lines shown');
    assert.match(await page.textContent('#ablation-verdicts'), /Archived|Not triaged/);
    const before = await page.textContent('#ablation-diff');
    await page.selectOption('#ablation-report', 'WP-21127');
    assert.notEqual(await page.textContent('#ablation-diff'), before);
    assert.match(page.url(), /report=WP-21127/);
    await page.goto(base + '/workbench');
    await page.fill('#in-title', 'Independent tab title');
    const other = await context.newPage(); await other.goto(base + '/ablation?report=WP-20770');
    assert.equal(await page.inputValue('#in-title'), 'Independent tab title');
    assert.equal(await other.inputValue('#ablation-report'), 'WP-20770');
    await page.setViewportSize({width:1440,height:900});
    await page.getByRole('navigation',{name:'Main',exact:true}).getByRole('link',{name:'Reports',exact:true}).click();
    await page.goBack(); assert.equal(new URL(page.url()).pathname, '/workbench');
    await page.goForward(); assert.equal(new URL(page.url()).pathname, '/reports');
    await page.goto(base + '/workbench'); await page.fill('#in-body', 'Private report body'); await page.locator('#report-options>summary').press('Enter');await page.locator('#btn-link').click();
    assert.ok(!new URL(page.url()).hash.includes('text='), 'private report text never enters URL fragment');
    assert.match(await page.textContent('#link-status'), /Private or edited report/);
    assert.ok(!new URL(page.url()).search.includes('text='), 'report text is absent from server query');
    await page.goto(base + '/workbench'); await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'h-check');
    await page.setViewportSize({width:320,height:900});
    await page.locator('#btn-menu').click(); await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'btn-menu');
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({routes:routes.length,widths:[320,375,768,1024,1440],axe_scans:scans,page_errors:errors.length,history:true,tabs:true,keyboard:true}));
  } finally { if (browser) await browser.close(); server.close(); }
})().catch(error => {console.error(error);process.exitCode=1;});
