// With JavaScript turned off, the page says so in a <noscript> message inside <main>, and points to the README,
// instead of showing an empty checker.   node test/noscript.e2e.js   (needs Playwright)
"use strict";
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const http = require("http");

const DOCS = path.join(__dirname, "..", "docs");
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  const file = path.normalize(path.join(DOCS, url === "/" ? "index.html" : url));
  if (!file.startsWith(DOCS) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": path.extname(file) === ".html" ? "text/html; charset=utf-8" : "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

let failures = 0;
let browser = null;
const ok = (cond, msg) => { console.log((cond ? "  ok   " : "  FAIL ") + msg); if (!cond) failures++; };

(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + server.address().port + "/";
  browser = await chromium.launch();
  for (const width of [1280, 375]) {
    for (const scheme of ["light", "dark"]) {
      const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width, height: 800 }, colorScheme: scheme });
      const page = await ctx.newPage();
      await page.goto(base);
      const msg = page.locator("main .noscript");
      const tag = width + "px " + scheme + ": ";
      ok((await msg.count()) === 1 && (await msg.isVisible()), tag + "a no-JavaScript message is visible inside <main>");
      const text = (await msg.count()) ? await msg.innerText() : "";
      ok(/needs JavaScript/.test(text), tag + "it says the page needs JavaScript");
      ok((await msg.locator('a[href*="github.com/anirudh763/talkback-triage-pilot"]').count()) === 1, tag + "it links to the README");
      if (await msg.count()) {
        const box = await msg.boundingBox();
        ok(box && box.x >= 0 && box.x + box.width <= width, tag + "it fits the viewport");
        const c = await msg.evaluate((el) => { const s = getComputedStyle(el); return [s.color, s.backgroundColor]; });
        ok(c[0] !== c[1], tag + "text and background colours differ (" + c.join(" on ") + ")");
      }
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth).catch(() => 0);
      ok(over <= 0, tag + "no horizontal page scroll");
      await ctx.close();
    }
  }
  // With JavaScript on, the message is not shown.
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(base); await page.waitForSelector("#checklist li");
    ok((await page.locator("main .noscript").count()) === 0 || !(await page.locator("main .noscript").isVisible()), "with JavaScript on, the message is hidden");
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(failures ? failures + " check(s) failed" : "all checks passed");
  process.exitCode = failures ? 1 : 0;
})().catch(async (e) => { console.error(e); process.exitCode = 1; if (browser) await browser.close(); server.close(); });
