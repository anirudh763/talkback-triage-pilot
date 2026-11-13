// Browser test of the report checker (the front page) and the accessibility gate for every view.
// Serves docs/ as GitHub Pages would, with no Claude runtime: the standalone, offline page.
//   node test/checker.e2e.js            run the checks
//   node test/checker.e2e.js --shots    also write the README screenshots to docs/screenshots/
// Needs Playwright and axe-core (npm install).
"use strict";
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const http = require("http");

const DOCS = path.join(__dirname, "..", "docs");
const AXE = (() => {
  for (const p of [() => require.resolve("axe-core/axe.min.js"), () => "/home/claude/site/build/node_modules/axe-core/axe.min.js"]) {
    try { const f = p(); if (fs.existsSync(f)) return fs.readFileSync(f, "utf8"); } catch (e) { /* try the next */ }
  }
  throw new Error("axe-core not found: run npm install");
})();
const SHOTS = process.argv.includes("--shots");
const TYPES = { ".html": "text/html; charset=utf-8", ".woff2": "font/woff2", ".png": "image/png", ".css": "text/css", ".js": "text/javascript" };

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  const file = path.normalize(path.join(DOCS, url === "/" ? "index.html" : url));
  if (!file.startsWith(DOCS) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

let failures = 0;
let browser = null;
const ok = (cond, msg) => { console.log((cond ? "  ok   " : "  FAIL ") + msg); if (!cond) failures++; };

(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + server.address().port + "/";
  browser = await chromium.launch();
  const errors = [];
  const offsite = [];
  async function open(opts, hash) {
    const ctx = await browser.newContext(Object.assign({ viewport: { width: 1280, height: 900 } }, opts));
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
    page.on("request", (r) => { if (!r.url().startsWith(base)) offsite.push(r.url()); });
    await page.goto(base + (hash || ""));
    await page.waitForSelector("#checklist li");
    return { ctx, page };
  }
  const statuses = (page) => page.$$eval("#checklist li", (els) => els.map((e) => e.dataset.key + ":" + e.dataset.status));

  // ---- the checker: sample, template, copy, URL state ----
  console.log("checker");
  {
    const { ctx, page } = await open({ permissions: ["clipboard-read", "clipboard-write"] });
    ok((await page.locator("#checklist li").count()) === 7, "first screen already shows a checked sample (7 checklist rows)");
    await page.getByRole("button", { name: "Try a sample report" }).click();
    const st = await statuses(page);
    const missing = page.locator('#checklist li[data-status="missing"]');
    ok((await missing.count()) >= 1, "sample has at least one missing item: " + st.join(" "));
    ok((await missing.first().locator(".state").textContent()) === "Missing", "missing is said in text, not only by colour");
    ok((await missing.first().locator("svg.ico").count()) === 1, "missing row has an icon");
    const tpl = await page.textContent("#tpl");
    ok(tpl.startsWith("### Summary") && tpl.includes("### Steps to reproduce") && tpl.includes("[MISSING:"), "rewritten report template appears with [MISSING: ...] placeholders");
    ok((await page.locator("#tpl mark.missing").count()) >= 1, "placeholders are highlighted");
    ok(/of \d found/.test(await page.textContent("#chk-score")), "summary: " + (await page.textContent("#chk-score")));
    ok(/Sample \d of 3/.test(await page.textContent("#ex-source")), "source line names the real issue: " + (await page.textContent("#ex-source")));
    ok(/^#check\?report=[A-Z]+-\d+$/.test(await page.evaluate(() => location.hash)), "URL holds the sample: " + (await page.evaluate(() => location.hash)));
    await page.click("#btn-copy-tpl");
    await page.waitForFunction(() => document.querySelector("#copy-tpl-status").textContent);
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    ok(clip === tpl, "Copy report copies exactly the template text");

    // a shared sample link opens the same report
    const sampleUrl = await page.evaluate(() => location.href);
    const title = await page.inputValue("#in-title");
    const p2 = await ctx.newPage();
    await p2.goto(sampleUrl); await p2.waitForSelector("#checklist li");
    ok((await p2.inputValue("#in-title")) === title, "a ?report= link opens the same report");

    // pasted text, including HTML, is shown as text and never run
    const evil = '<img src=x onerror="window.__xss=1"><script>window.__xss=2</script>';
    await page.fill("#in-title", evil);
    await page.fill("#in-body", "1. Turn on TalkBack\n2. Open the Settings screen\n" + evil + "\nApp version: 5.2.1");
    await page.waitForFunction(() => document.querySelector("#tpl").textContent.includes("5.2.1"));
    ok((await page.evaluate(() => window.__xss)) === undefined, "pasted HTML is not executed");
    ok((await page.locator("#tpl img, #checklist img, #tpl script, #ex-source img").count()) === 0, "pasted HTML creates no elements");
    ok((await page.textContent("#tpl")).includes(evil), "pasted HTML is shown as text");
    ok(await page.evaluate(() => location.hash === "#check"), "editing drops the sample from the URL");
    await page.click("#btn-link");
    await page.waitForFunction(() => document.querySelector("#link-status").textContent);
    const link = await page.evaluate(() => navigator.clipboard.readText());
    ok(/#check\?text=[A-Za-z0-9_-]+$/.test(link), "Copy link puts the text in the URL fragment");
    const p3 = await ctx.newPage();
    p3.on("pageerror", (e) => errors.push("pageerror: " + e.message));
    await p3.goto(link); await p3.waitForSelector("#checklist li");
    await p3.waitForTimeout(100);
    ok((await p3.inputValue("#in-title")) === evil && (await p3.evaluate(() => window.__xss)) === undefined, "a ?text= link restores the pasted text, still inert");
    const bad = await ctx.newPage();
    await bad.goto(base + "#check?text=%3Cscript%3E"); await bad.waitForSelector("#checklist li");
    ok(/couldn't be read/.test(await bad.textContent("#ex-source")), "a broken link says so instead of failing");

    await page.click("#btn-clear");
    ok((await page.textContent("#chk-score")).startsWith("Nothing to check yet"), "Clear empties the report and says what to do");
    ok(await page.evaluate(() => document.activeElement.id === "in-body"), "Clear moves focus to the report box");
    ok((await page.locator("#ai-card").isHidden()), "AI study tool is hidden when no AI is available");
    await ctx.close();
  }

  // ---- axe-core in light and dark, every view ----
  console.log("axe-core");
  const axeCounts = {};
  for (const scheme of ["light", "dark"]) {
    const { ctx, page } = await open({ colorScheme: scheme });
    for (const v of ["check", "pilot", "label", "about"]) {
      await page.click("#tab-" + v);
      await page.waitForTimeout(80);
      await page.addScriptTag({ content: AXE });
      const res = await page.evaluate(async () => {
        const r = await window.axe.run(document, { resultTypes: ["violations"] });
        return r.violations.map((x) => x.id + " (" + x.nodes.length + "): " + x.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(", "));
      });
      axeCounts[scheme + "/" + v] = res.length;
      ok(res.length === 0, "axe " + scheme + " " + v + ": " + res.length + " violations" + (res.length ? "\n         " + res.join("\n         ") : ""));
    }
    await ctx.close();
  }

  // ---- 320px wide (and keyboard) ----
  console.log("layout");
  for (const width of [320, 390]) {
    const { ctx, page } = await open({ viewport: { width, height: 800 } });
    for (const v of ["check", "pilot", "label", "about"]) {
      await page.click("#tab-" + v); await page.waitForTimeout(60);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(over <= 0, width + "px " + v + ": no horizontal page scroll (overflow " + over + "px)");
    }
    await ctx.close();
  }
  {
    const { ctx, page } = await open({});
    await page.keyboard.press("Tab"); await page.keyboard.press("Tab");
    ok(await page.evaluate(() => document.activeElement.id === "tab-check"), "keyboard: skip link, then the tabs");
    await page.keyboard.press("ArrowRight");
    ok(await page.evaluate(() => document.activeElement.id === "tab-pilot" && !document.querySelector("#pilot").hidden && location.hash === "#pilot"), "keyboard: arrow keys switch tabs and update the URL");
    await page.click("#tab-check");
    ok(/^#check\?report=/.test(await page.evaluate(() => location.hash)), "returning to the checker keeps its report in the URL");
    const small = await page.$$eval("button, a, select, input, summary, textarea", (els) => els.filter((e) => e.offsetParent && !e.closest(".lint, .prose, p, td, dd, li") ).map((e) => { const r = e.getBoundingClientRect(); return [e.id || e.textContent.trim().slice(0, 20), Math.round(r.width), Math.round(r.height)]; }).filter(([, w, h]) => w < 24 || h < 24));
    ok(!small.length, "controls are at least 24x24px" + (small.length ? ": " + JSON.stringify(small) : ""));
    await ctx.close();
  }

  // ---- README screenshots: light theme, real sample data, 2x ----
  if (SHOTS) {
    const dir = path.join(DOCS, "screenshots");
    fs.mkdirSync(dir, { recursive: true });
    const { ctx, page } = await open({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2, colorScheme: "light" }, "#check?report=WP-21127");
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(dir, "checker.png") });
    await page.click("#tab-pilot"); await page.waitForTimeout(200);
    await page.evaluate(() => { const r = document.querySelector("#results"); window.scrollTo(0, r.getBoundingClientRect().top + window.scrollY - 16); });
    await page.screenshot({ path: path.join(dir, "study-results.png") });
    await ctx.close();
    const m = await open({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: "light" }, "#check?report=AP-3563");
    await m.page.locator("#chk-h").scrollIntoViewIfNeeded();
    await m.page.screenshot({ path: path.join(dir, "checker-mobile.png") });
    await m.ctx.close();
    console.log("  wrote docs/screenshots/checker.png, study-results.png, checker-mobile.png");
  }

  await browser.close(); server.close();
  ok(!offsite.length, "no network requests leave the page's own origin" + (offsite.length ? ": " + offsite.slice(0, 5).join(", ") : ""));
  ok(!errors.length, "no page or console errors" + (errors.length ? ": " + errors.join("; ") : ""));
  console.log("\naxe violations by theme/view:", JSON.stringify(axeCounts));
  console.log(failures ? failures + " check(s) failed" : "all checks passed");
  process.exitCode = failures ? 1 : 0;
})().catch(async (e) => { console.error(e); process.exitCode = 1; if (browser) await browser.close(); server.close(); });
