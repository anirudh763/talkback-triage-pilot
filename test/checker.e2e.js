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
const TYPES = { ".html": "text/html; charset=utf-8", ".woff2": "font/woff2", ".png": "image/png", ".css": "text/css", ".js": "text/javascript",
  ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  const file = path.normalize(path.join(DOCS, url === "/" ? "index.html" : url));
  if (!file.startsWith(DOCS) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

const ROUTE = { check: "#/check", pilot: "#/research", label: "#/research/labels", about: "#/research/methods" };
const goView = async (page, v) => { await page.evaluate((x) => { location.hash = x; }, ROUTE[v]); await page.waitForTimeout(80); };
let failures = 0;
let browser = null;
const ok = (cond, msg) => { console.log((cond ? "  ok   " : "  FAIL ") + msg); if (!cond) failures++; };

(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + server.address().port + "/";
  browser = await chromium.launch();
  const errors = [];
  const offsite = [];
  async function open(opts, hash, dark) {
    const ctx = await browser.newContext(Object.assign({ viewport: { width: 1280, height: 900 } }, opts));
    if (dark) await ctx.addInitScript(() => { try { localStorage.setItem("tbt-theme", "dark"); } catch (e) { /* ignore */ } });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
    page.on("request", (r) => { if (!r.url().startsWith(base)) offsite.push(r.url()); });
    await page.goto(base + (hash || ""));
    await page.waitForSelector("#checklist li", { state: "attached" });
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
    const missing = page.locator('#checklist li[data-status="notfound"]');
    ok((await missing.count()) >= 1, "sample has at least one item not found: " + st.join(" "));
    ok((await missing.first().locator(".state").textContent()) === "Not found", "\"Not found\" is said in text, not only by colour");
    ok((await missing.first().locator("svg.ico").count()) === 1, "the not-found row has an icon");
    ok(!/\bmissing\b/i.test((await page.textContent("#checklist")) + (await page.textContent("#chk-score")) + (await page.getAttribute("#tpl", "aria-label"))), "the checker's own labels never say \"missing\"");
    const tpl = await page.textContent("#tpl");
    ok(tpl.startsWith("### Summary") && tpl.includes("### Steps to reproduce") && tpl.includes("[ADD:"), "rewritten report template appears with [ADD: ...] placeholders");
    ok((await page.locator("#tpl mark.add").count()) >= 1, "placeholders are highlighted");
    ok(/of \d found/.test(await page.textContent("#chk-score")), "summary: " + (await page.textContent("#chk-score")));
    ok(/Sample \d of 3/.test(await page.textContent("#ex-source")), "source line names the real issue: " + (await page.textContent("#ex-source")));
    ok(/^#\/check\?report=[A-Z]+-\d+$/.test(await page.evaluate(() => location.hash)), "URL holds the sample: " + (await page.evaluate(() => location.hash)));
    await page.getByRole("link", { name: "Review draft" }).click(); await page.waitForTimeout(80);
    await page.click("#btn-copy-tpl");
    await page.waitForFunction(() => document.querySelector("#copy-tpl-status").textContent);
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    ok(clip === tpl, "Copy draft copies exactly the template text");
    await page.goBack(); await page.waitForTimeout(80);

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
    // give any injected image or script every chance to load and run before checking
    await page.waitForLoadState("networkidle"); await page.waitForTimeout(200);
    ok((await page.evaluate(() => window.__xss)) === undefined, "pasted HTML is not executed");
    ok((await page.locator("#tpl img, #checklist img, #tpl script, #ex-source img, #preview img, #preview script, #gaps img").count()) === 0, "pasted HTML creates no elements");
    ok((await page.textContent("#tpl")).includes(evil), "pasted HTML is shown as text");
    ok(await page.evaluate(() => location.hash === "#/check"), "editing drops the sample from the URL");
    await page.click("#btn-link");
    await page.waitForFunction(() => document.querySelector("#link-status").textContent);
    const link = await page.evaluate(() => navigator.clipboard.readText());
    ok(/#\/check\?text=[A-Za-z0-9_-]+$/.test(link), "Copy link puts the text in the URL fragment");
    const p3 = await ctx.newPage();
    p3.on("pageerror", (e) => errors.push("pageerror: " + e.message));
    await p3.goto(link); await p3.waitForSelector("#checklist li");
    await p3.waitForLoadState("networkidle"); await p3.waitForTimeout(200);
    ok((await p3.inputValue("#in-title")) === evil && (await p3.evaluate(() => window.__xss)) === undefined, "a ?text= link restores the pasted text, still inert");
    const bad = await ctx.newPage();
    await bad.goto(base + "#check?text=%3Cscript%3E"); await bad.waitForSelector("#checklist li");
    ok(/couldn't be read/.test(await bad.textContent("#ex-source")), "a broken link says so instead of failing");

    await page.click("#btn-clear");
    ok((await page.textContent("#chk-score")).startsWith("Nothing to check yet"), "Clear empties the report and says what to do");
    ok(await page.evaluate(() => document.activeElement.id === "in-body"), "Clear moves focus to the report box");
    ok((await page.locator("#ai-card").isHidden()), "AI study tool is hidden when no AI is available");
    ok(/carries the full report text/.test(await page.textContent("#link-hint")), "the page warns that a link carries the report text");
    await goView(page, "pilot");
    ok((await page.locator("#run-card").isHidden()) && (await page.locator("#run-off").isVisible()), "the pilot's run controls are hidden outside the Claude app, with a note instead");
    await ctx.close();
  }

  // ---- axe-core in light and dark, every view ----
  console.log("axe-core");
  const axeCounts = {};
  for (const width of [1280, 375]) for (const scheme of ["light", "dark"]) {
    // dark is an explicit choice (the Dark theme toggle, remembered in localStorage), not the OS setting
    const { ctx, page } = await open({ colorScheme: scheme, viewport: { width, height: 900 } }, "", scheme === "dark");
    for (const v of ["check", "pilot", "label", "about"]) {
      await goView(page, v);
      await page.evaluate(AXE); // evaluated, not injected as a <script>: the page's CSP would block that
      const res = await page.evaluate(async () => {
        const r = await window.axe.run(document, { resultTypes: ["violations"] });
        return r.violations.map((x) => x.id + " (" + x.nodes.length + "): " + x.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(", "));
      });
      axeCounts[width + "/" + scheme + "/" + v] = res.length;
      ok(res.length === 0, "axe " + width + "px " + scheme + " " + v + ": " + res.length + " violations" + (res.length ? "\n         " + res.join("\n         ") : ""));
    }
    await ctx.close();
  }

  // ---- 320px wide (and keyboard) ----
  console.log("layout");
  for (const width of [320, 375, 390]) {
    const { ctx, page } = await open({ viewport: { width, height: 800 } });
    for (const v of ["check", "pilot", "label", "about"]) {
      await goView(page, v);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(over <= 0, width + "px " + v + ": no horizontal page scroll (overflow " + over + "px)");
      const clipped = await page.$$eval("#btn-menu, .crumbs a", (els) => els.filter((e) => { const r = e.getBoundingClientRect(); return r.left < 0 || r.right > window.innerWidth; }).map((e) => e.textContent));
      ok(!clipped.length, width + "px " + v + ": Menu and breadcrumb are fully visible" + (clipped.length ? ": " + clipped.join(", ") : ""));
    }
    await ctx.close();
  }
  {
    const { ctx, page } = await open({});
    await page.keyboard.press("Tab");
    ok(await page.evaluate(() => document.activeElement.id === "skip"), "keyboard: the first Tab reaches Skip to content");
    await page.keyboard.press("Enter");
    ok(await page.evaluate(() => document.activeElement.id === "h-check" && location.hash.startsWith("#/check")), "keyboard: Skip to content moves focus to the screen's H1 without changing the route");
    await page.focus("#skip"); await page.keyboard.press("Tab");
    ok(await page.evaluate(() => document.activeElement.classList.contains("wordmark")), "keyboard: after the skip link, the rail comes first");
    await page.locator("#rail").getByRole("link", { name: "Research" }).click(); await page.waitForTimeout(80);
    await page.locator("#rail").getByRole("link", { name: "Check a report" }).click(); await page.waitForTimeout(80);
    ok(/^#\/check\?report=/.test(await page.evaluate(() => location.hash)), "returning to the checker keeps its report in the URL");
    // WCAG 2.5.8 target size on every tab. Radio buttons and checkboxes are measured by their label (the click target);
    // the only exception taken is links inside a sentence (the "inline" exception).
    for (const v of ["check", "pilot", "label", "about"]) {
      await goView(page, v);
      const small = await page.$$eval("button, a, select, input, summary, textarea", (els) => els
        .filter((e) => e.offsetParent && !(e.tagName === "A" && e.closest("p, li, dd, td, .prose")))
        .map((e) => { const t = /^(radio|checkbox)$/.test(e.type) && e.closest("label") ? e.closest("label") : e; const r = t.getBoundingClientRect(); return [e.id || e.name || e.textContent.trim().slice(0, 20), Math.round(r.width), Math.round(r.height)]; })
        .filter(([, w, h]) => w < 24 || h < 24));
      ok(!small.length, v + ": controls are at least 24x24px" + (small.length ? ": " + JSON.stringify(small) : ""));
    }
    await ctx.close();
  }

  // ---- keyboard only: reach and use the checker without a pointer, with a visible focus ring ----
  console.log("keyboard, zoom and error states");
  {
    const { ctx, page } = await open({ permissions: ["clipboard-read", "clipboard-write"] });
    const focusOutline = () => page.evaluate(() => { const s = getComputedStyle(document.activeElement); return s.outlineStyle !== "none" && parseFloat(s.outlineWidth) >= 2; });
    const tabTo = async (id, max) => { for (let i = 0; i < (max || 40); i++) { await page.keyboard.press("Tab"); if (await page.evaluate((x) => document.activeElement.id === x, id)) return true; } return false; };
    ok(await tabTo("btn-sample"), "keyboard: Tab reaches \"Try a sample report\"");
    ok(await focusOutline(), "keyboard: focused button shows a focus ring");
    const before = await page.inputValue("#in-title");
    await page.keyboard.press("Enter");
    ok((await page.inputValue("#in-title")) !== before && (await page.locator('#checklist li[data-status="notfound"]').count()) >= 1, "keyboard: Enter loads the next sample and checks it");
    ok(await tabTo("in-body"), "keyboard: Tab reaches the report box");
    await page.keyboard.press("Control+A"); await page.keyboard.type("1. Open the Episodes screen\n2. Tap Play\nApp version: 9");
    await page.waitForTimeout(300);
    ok(/App version/.test(await page.textContent("#checklist")) && (await page.locator('#checklist li[data-key="appVersion"]').getAttribute("data-status")) === "present", "keyboard: typed text is checked as you type");
    ok(await tabTo("btn-review"), "keyboard: Tab reaches Review draft");
    await page.keyboard.press("Enter"); await page.waitForTimeout(80);
    ok(await tabTo("btn-copy-tpl"), "keyboard: on the Draft screen, Tab reaches Copy draft");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.querySelector("#copy-tpl-status").textContent);
    ok((await page.evaluate(() => navigator.clipboard.readText())).includes("App version: 9"), "keyboard: Enter on Copy draft copies the rewrite");
    await ctx.close();
  }
  // ---- found / not found tags in "Every report in this run": the state must show without colour (WCAG 1.4.1) ----
  for (const scheme of ["light", "dark"]) {
    const { ctx, page } = await open({ colorScheme: scheme }, "", scheme === "dark");
    await goView(page, "pilot");
    await page.waitForSelector('[aria-label="Every report in this run"] tbody tr');
    // Each tag's state comes from its screen-reader text; its look is everything except colour.
    const tags = await page.$$eval('[aria-label="Every report in this run"] tbody td:nth-child(2) span[title]', (els) => els.map((e) => {
      const s = getComputedStyle(e);
      return { found: !/not found$/.test(e.textContent), look: [s.borderTopStyle, s.textDecorationLine, s.fontWeight, s.fontStyle].join("|") };
    }));
    const looks = (f) => new Set(tags.filter((t) => t.found === f).map((t) => t.look));
    const on = looks(true), off = looks(false);
    ok(tags.length > 0 && on.size > 0 && off.size > 0, scheme + ": the per-report table has found and not-found tags (" + tags.length + ")");
    ok([...off].every((l) => !on.has(l)), scheme + ": not-found tags differ from found tags by more than colour (found " + [...on].join(", ") + "; not found " + [...off].join(", ") + ")");
    await ctx.close();
  }

  // ---- 200% zoom: a 1280px window at 200% is a 640px-wide CSS viewport with 2x pixels ----
  {
    const { ctx, page } = await open({ viewport: { width: 640, height: 450 }, deviceScaleFactor: 2 });
    for (const v of ["check", "pilot", "label", "about"]) {
      await goView(page, v);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(over <= 0, "200% zoom " + v + ": no horizontal page scroll (overflow " + over + "px)");
    }
    await goView(page, "check");
    const cut = await page.$$eval("#checklist .name, #checklist .state, #btn-menu, #btn-sample, #btn-review", (els) => els.filter((e) => e.scrollWidth > e.clientWidth + 1 || e.getBoundingClientRect().right > window.innerWidth).map((e) => e.textContent));
    ok(!cut.length, "200% zoom: labels and buttons are not cut off" + (cut.length ? ": " + cut.join(", ") : ""));
    await ctx.close();
  }
  // ---- error states: empty input, a report too long for a link, a broken link ----
  {
    const { ctx, page } = await open({ permissions: ["clipboard-read", "clipboard-write"] });
    await page.click("#btn-clear");
    await page.waitForTimeout(100);
    ok(/Nothing to check yet/.test(await page.textContent("#chk-score")) && /Paste a report/.test(await page.textContent("#ex-source")), "empty input: says what to do");
    await page.fill("#in-body", "x".repeat(13000));
    await page.click("#btn-link");
    await page.waitForFunction(() => document.querySelector("#link-status").textContent);
    ok(/too long to put in a link/.test(await page.textContent("#link-status")), "too long for a link: says so and suggests copying the draft");
    await page.goto(base + "#check?text=AAAA"); await page.waitForTimeout(150);
    ok(/couldn't be read/.test(await page.textContent("#ex-source")), "a link with an unreadable report says so");
    await ctx.close();
  }

  // ---- Content Security Policy: the page can't send data to another site ----
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(base); await page.waitForSelector("#checklist li");
    const csp = await page.getAttribute('meta[http-equiv="Content-Security-Policy"]', "content");
    ok(/connect-src 'self'/.test(csp) && /default-src 'self'/.test(csp) && !/unsafe-inline[^;]*;/.test(csp.split("script-src")[1].split(";")[0] + ";"), "CSP: " + csp.replace(/'sha256-[^']+'/g, "'sha256-…'"));
    const res = await page.evaluate(() => fetch("https://example.com/").then(() => "sent", () => "blocked"));
    ok(res === "blocked", "a request to another site is blocked by the page's CSP (" + res + ")");
    await ctx.close();
  }

  // ---- README screenshots: light theme, real sample data, 2x ----
  if (SHOTS) {
    const dir = path.join(DOCS, "screenshots");
    fs.mkdirSync(dir, { recursive: true });
    // the primary screen (Check, the report composer) at the root gate's 1440 and 320 widths, plus the README shots
    for (const [w, hgt, file] of [[1440, 1100, "check-1440.png"], [320, 1600, "check-320.png"], [1280, 1000, "checker.png"]]) {
      const s1 = await open({ viewport: { width: w, height: hgt }, deviceScaleFactor: 2, colorScheme: "light" }, "#/check?report=AP-3563");
      await s1.page.waitForTimeout(200);
      await s1.page.screenshot({ path: path.join(dir, file) });
      await s1.ctx.close();
    }
    const { ctx, page } = await open({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2, colorScheme: "light" }, "#/research");
    await page.waitForTimeout(200);
    await page.evaluate(() => { const r = document.querySelector("#results"); window.scrollTo(0, r.getBoundingClientRect().top + window.scrollY - 16); });
    await page.screenshot({ path: path.join(dir, "study-results.png") });
    await goView(page, "check"); await page.getByRole("link", { name: "Review draft" }).click(); await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(dir, "draft-1280.png") });
    await ctx.close();
    const m = await open({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: "light" }, "#/check?report=AP-3563");
    await m.page.locator("#pv-h").scrollIntoViewIfNeeded();
    await m.page.screenshot({ path: path.join(dir, "checker-mobile.png") });
    await m.ctx.close();
    console.log("  wrote docs/screenshots/check-1440.png, check-320.png, checker.png, study-results.png, draft-1280.png, checker-mobile.png");
  }

  await browser.close(); server.close();
  ok(!offsite.length, "no network requests leave the page's own origin" + (offsite.length ? ": " + offsite.slice(0, 5).join(", ") : ""));
  ok(!errors.length, "no page or console errors" + (errors.length ? ": " + errors.join("; ") : ""));
  console.log("\naxe violations by width/theme/view:", JSON.stringify(axeCounts));
  console.log(failures ? failures + " check(s) failed" : "all checks passed");
  process.exitCode = failures ? 1 : 0;
})().catch(async (e) => { console.error(e); process.exitCode = 1; if (browser) await browser.close(); server.close(); });
