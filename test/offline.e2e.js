// Installable and offline: the standalone page (docs/, as GitHub Pages serves it) has a web app manifest with
// icons, registers a service worker with a relative scope and a versioned cache, and after one online visit the
// report checker still loads and analyzes a sample with the network off. The page's CSP must stay intact.
//   node test/offline.e2e.js        (needs Playwright)
"use strict";
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const http = require("http");

const DOCS = path.join(__dirname, "..", "docs");
const VERSION = require("../package.json").version;
const TYPES = { ".html": "text/html; charset=utf-8", ".woff2": "font/woff2", ".png": "image/png", ".svg": "image/svg+xml",
  ".js": "text/javascript", ".webmanifest": "application/manifest+json", ".txt": "text/plain" };
// Served under /app/ so a worker or manifest with an absolute "/" path would break, as on GitHub Pages' /talkback-triage-pilot/.
const PREFIX = "/app/";
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (!url.startsWith(PREFIX)) { res.writeHead(404); res.end(); return; }
  const rest = url.slice(PREFIX.length);
  const file = path.normalize(path.join(DOCS, rest === "" ? "index.html" : rest));
  if (!file.startsWith(DOCS) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

let failures = 0;
let browser = null;
const ok = (cond, msg) => { console.log((cond ? "  ok   " : "  FAIL ") + msg); if (!cond) failures++; };

(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + server.address().port + PREFIX;
  browser = await chromium.launch();
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  // the deliberate request to an uncached path below is the only resource allowed to fail
  page.on("console", (m) => { if (m.type() === "error" && !/not-cached-/.test(m.location().url || "")) errors.push("console: " + m.text() + " " + (m.location().url || "")); });

  console.log("install");
  await page.goto(base);
  await page.waitForSelector("#checklist li");
  const links = await page.evaluate(() => ({
    manifest: (document.querySelector('link[rel="manifest"]') || {}).href || null,
    icon: (document.querySelector('link[rel="icon"]') || {}).href || null,
    csp: (document.querySelector('meta[http-equiv="Content-Security-Policy"]') || {}).content || "",
  }));
  ok(links.manifest === base + "manifest.webmanifest", "page links a manifest next to it: " + links.manifest);
  ok(links.icon === base + "icon.svg", "page has an SVG favicon: " + links.icon);
  ok(/worker-src 'self'/.test(links.csp) && /default-src 'self'/.test(links.csp) && /connect-src 'self'/.test(links.csp) && !/script-src[^;]*unsafe-inline/.test(links.csp),
    "CSP still blocks other sites and inline scripts without a hash, and allows the page's own worker");
  if (links.manifest) {
    const m = await (await page.request.get(links.manifest)).json().catch(() => null);
    ok(m && m.name && m.start_url === "./" && m.scope === "./" && m.display === "standalone", "manifest: name, relative start_url and scope, standalone");
    const sizes = (m && m.icons || []).map((i) => i.sizes).sort();
    ok(JSON.stringify(sizes) === JSON.stringify(["192x192", "512x512", "any"]), "manifest icons: SVG plus 192 and 512 PNG (" + sizes.join(", ") + ")");
    for (const i of (m && m.icons) || []) {
      const r = await page.request.get(new URL(i.src, links.manifest).href);
      ok(r.ok() && (r.headers()["content-type"] || "").startsWith(i.type), "icon " + i.src + " is served as " + i.type);
      if (i.type === "image/png") {
        const buf = await r.body();
        const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
        ok(i.sizes === w + "x" + h, "icon " + i.src + " is really " + w + "x" + h);
      }
    }
  }

  const sw = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return { error: "no serviceWorker API" };
    const timeout = new Promise((r) => setTimeout(() => r(null), 8000));
    const reg = await Promise.race([navigator.serviceWorker.ready, timeout]);
    if (!reg) return { error: "no service worker registered within 8s" };
    if (!navigator.serviceWorker.controller) await Promise.race([new Promise((r) => navigator.serviceWorker.addEventListener("controllerchange", r, { once: true })), timeout]);
    return { scope: reg.scope, script: reg.active && reg.active.scriptURL, controlled: !!navigator.serviceWorker.controller, caches: await caches.keys() };
  });
  ok(!sw.error, "a service worker is registered" + (sw.error ? ": " + sw.error : ""));
  ok(sw.scope === base, "worker scope is the page's folder (relative scope): " + sw.scope);
  ok(sw.script === base + "sw.js", "worker script sits next to the page: " + sw.script);
  ok(sw.controlled, "the worker controls the page");
  ok((sw.caches || []).includes("talkback-triage-pilot-v" + VERSION), "cache name carries the version " + VERSION + ": " + JSON.stringify(sw.caches));

  console.log("offline");
  await ctx.setOffline(true);
  const blocked = await page.evaluate(() => fetch("/not-cached-" + Date.now()).then(() => "reached", () => "failed"));
  ok(blocked === "failed", "the network is really off (an uncached request fails)");
  const reloaded = await page.reload().then(() => "", (e) => e.message.split("\n")[0]);
  ok(!reloaded, "offline: the page reloads" + (reloaded ? " (" + reloaded + ")" : ""));
  await page.waitForSelector("#checklist li", { timeout: 5000 }).catch(() => null);
  ok((await page.locator("#checklist li").count()) === 7, "offline reload: the checker loads and shows 7 checklist rows");
  page.setDefaultTimeout(3000); // a page that failed to load must fail fast, not wait 30s per step
  await page.getByRole("button", { name: "Try a sample report" }).click().catch(() => null);
  ok(/Sample \d of 3/.test(await page.textContent("#ex-source").catch(() => "")), "offline: Try a sample report loads a sample");
  ok((await page.locator('#checklist li[data-status="notfound"]').count()) >= 1 && /of \d found/.test(await page.textContent("#chk-score").catch(() => "")), "offline: the sample is analyzed");
  await page.fill("#in-body", "1. Turn on TalkBack\n2. Open the Post list screen\nApp version: 24.8\nPixel 8, Android 14").catch(() => null);
  await page.waitForTimeout(300);
  ok((await page.getAttribute('#checklist li[data-key="appVersion"]', "data-status").catch(() => null)) === "present", "offline: pasted text is checked");
  const font = await page.evaluate(() => document.fonts.check('16px "Atkinson Hyperlegible"') && [...document.fonts].some((f) => f.family.includes("Atkinson") && f.status === "loaded"));
  ok(font, "offline: the page's own font loads from the cache");
  await ctx.setOffline(false);
  await ctx.close();

  await browser.close(); server.close();
  ok(!errors.length, "no page or console errors" + (errors.length ? ": " + errors.join("; ") : ""));
  console.log(failures ? failures + " check(s) failed" : "all checks passed");
  process.exitCode = failures ? 1 : 0;
})().catch(async (e) => { console.error(e); process.exitCode = 1; if (browser) await browser.close(); server.close(); });
