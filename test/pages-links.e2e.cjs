'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const docs = path.join(__dirname, '../docs');
const prefix = '/talkback-triage-pilot/';
const types = {'.html':'text/html','.js':'text/javascript','.ttf':'font/ttf','.woff2':'font/woff2','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml'};
const server = http.createServer((req,res) => {
  const pathname = new URL(req.url,'http://local').pathname;
  const route = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : pathname.slice(1);
  const file = path.join(docs, ['', 'overview', 'workbench', 'reports', 'settings', 'ablation'].includes(route) ? 'index.html' : route);
  if (!file.startsWith(docs + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type',types[path.extname(file)] || 'text/plain');
  fs.createReadStream(file).pipe(res);
});
(async () => {
  let browser;
  try {
    await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
    const origin = 'http://127.0.0.1:' + server.address().port;
    browser = await chromium.launch({executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
    for (const prefixed of [true,false]) {
      const context = await browser.newContext({serviceWorkers:'block'});
      const page = await context.newPage(); const errors = [];
      page.on('pageerror',error => errors.push(error.message));
      await page.goto(origin + (prefixed ? prefix + '#/check' : '/workbench'));
      assert.equal(await page.locator('#compare-current').getAttribute('href'), prefixed ? '#/ablation' : '/workbench?tool=ablation');
      if(!(await page.locator('#sample-scenario').evaluate(el=>el.open)))await page.locator('#sample-scenario>summary').press('Enter');await page.locator('#run-demo').click();
      await page.waitForFunction(() => document.querySelector('#demo-status').textContent.startsWith('Offline check complete'));
      await page.fill('#in-title','Edited sample retained in this tab');
      await page.fill('#in-body',(await page.inputValue('#in-body')) + '\nLocal draft annotation.');
      const title = await page.inputValue('#in-title'), body = await page.inputValue('#in-body');
      await page.locator('#compare-current').click();
      await page.waitForSelector('#ablation-original:visible');
      assert.equal(new URL(page.url()).pathname, prefixed ? prefix : '/workbench');
      if (prefixed) assert.equal(new URL(page.url()).hash,'#/ablation');
      assert.equal(await page.textContent('#ablation-original'),title + '\n\n' + body);
      await page.locator('#ablation-reset').click();
      assert.equal(await page.textContent('#ablation-modified'),title + '\n\n' + body);
      assert.match(await page.textContent('#ablation-summary'),/unchanged/);
      const edit = page.getByRole('link',{name:'Edit report',exact:true});
      assert.equal(await edit.getAttribute('href'),prefixed ? '#/check' : '/workbench');
      await edit.click(); await page.waitForSelector('#in-body:visible');
      assert.equal(new URL(page.url()).pathname,prefixed ? prefix : '/workbench');
      assert.equal(await page.inputValue('#in-title'),title);
      assert.equal(await page.inputValue('#in-body'),body);
      await page.reload(); assert.equal(await page.inputValue('#in-body'),body);
      assert.deepEqual(errors,[]);
      console.log('PASS ' + (prefixed ? 'Pages prefix' : 'local direct') + ': demo → compare → restore → edit → reload preserves original and route');
      await context.close();
    }
  } finally { await browser?.close(); server.close(); }
})().catch(error => {console.error(error);process.exitCode=1;});
