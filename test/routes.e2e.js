// Root visual gate for the routed, light-first UI (round 4 rebuild). Serves docs/ as GitHub Pages would.
// Covers: each task on its own hash route with its own H1 and document title, focus on the H1 after a route
// change, the Menu sheet (Escape closes it and returns focus), Back/Forward and deep links restoring screen and
// state (title/body after Draft, the Examples filter), old #check?report= / #pilot / #label / #about links,
// light by default even when the OS prefers dark, an explicit remembered dark toggle, no page overflow at
// 320/768/1440, axe-core 0 violations in light and dark at 1280 and 320, a real Not found screen.
//   node test/routes.e2e.js        (needs Playwright and axe-core)
"use strict";
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const http = require("http");

// TB_DOCS: serve another build (used to record the fail-before count against origin/main)
const DOCS = process.env.TB_DOCS ? path.resolve(process.env.TB_DOCS) : path.join(__dirname, "..", "docs");
const AXE = (() => {
  for (const p of [() => require.resolve("axe-core/axe.min.js"), () => "/home/claude/site/build/node_modules/axe-core/axe.min.js"]) {
    try { const f = p(); if (fs.existsSync(f)) return fs.readFileSync(f, "utf8"); } catch (e) { /* try the next */ }
  }
  throw new Error("axe-core not found: run npm install");
})();
const TYPES = { ".html": "text/html; charset=utf-8", ".woff2": "font/woff2", ".png": "image/png", ".svg": "image/svg+xml",
  ".js": "text/javascript", ".webmanifest": "application/manifest+json", ".txt": "text/plain" };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  const file = path.normalize(path.join(DOCS, url === "/" ? "index.html" : url));
  if (!file.startsWith(DOCS) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

// route -> [visible H1, document title prefix, rail item marked current]
const SCREENS = [
  ["#/check", "Check a TalkBack report", "Check a report", "Check a report"],
  ["#/draft", "Review draft", "Review draft", "Draft"],
  ["#/examples", "Examples", "Examples", "Examples"],
  ["#/research", "Research results", "Research results", "Research"],
  ["#/research/labels", "Label reports", "Label reports", "Research"],
  ["#/research/methods", "Research methods", "Research methods", "Research"],
];
const APP = "TalkBack Triage";

let failures = 0;
let browser = null;
const ok = (cond, msg) => { console.log((cond ? "  ok   " : "  FAIL ") + msg); if (!cond) failures++; };
const h1Text = (page) => page.evaluate(() => { const h = [...document.querySelectorAll("main h1")].find((e) => e.offsetParent || e.getClientRects().length); return h ? h.textContent.trim() : null; });
const overflow = (page) => page.evaluate(() => document.scrollingElement.scrollWidth - window.innerWidth);

(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + server.address().port + "/";
  browser = await chromium.launch();
  const errors = [];
  async function open(opts, hash, dark) {
    const ctx = await browser.newContext(Object.assign({ viewport: { width: 1280, height: 900 } }, opts));
    if (dark) await ctx.addInitScript(() => { try { localStorage.setItem("tbt-theme", "dark"); } catch (e) { /* ignore */ } });
    const page = await ctx.newPage();
    page.setDefaultTimeout(4000); // a missing control fails fast instead of waiting 30 s
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
    await page.goto(base + (hash || ""));
    await page.waitForSelector("#checklist li", { state: "attached" });
    await page.waitForTimeout(60);
    return { ctx, page };
  }
  // each block runs guarded: an exception counts as one failure and the run continues
  const guard = async (name, fn) => { try { await fn(); } catch (e) { ok(false, name + ": " + String(e.message || e).split("\n")[0]); } };
  const goHash = async (page, hash) => { await page.evaluate((x) => { location.hash = x; }, hash); await page.waitForTimeout(80); };

  console.log("screens, titles and overflow");
  for (const width of [1440, 768, 320]) { await guard("block at line 70", async () => {
    const { ctx, page } = await open({ viewport: { width, height: 900 } });
    for (const [hash, h1, title, nav] of SCREENS) {
      await goHash(page, hash);
      if (width === 1440) {
        ok((await h1Text(page)) === h1, hash + ": H1 is \"" + h1 + "\" (" + (await h1Text(page)) + ")");
        ok((await page.title()) === title + " – " + APP, hash + ": document title \"" + title + " – " + APP + "\" (" + (await page.title()) + ")");
        const cur = await page.$$eval('[aria-current="page"]', (els) => els.filter((e) => e.closest("#rail")).map((e) => e.textContent.trim()));
        ok(cur.length === 1 && cur[0] === nav, hash + ": rail marks \"" + nav + "\" with aria-current=page (" + cur.join(", ") + ")");
      }
      const over = await overflow(page);
      ok(over <= 0, width + "px " + hash + ": no page horizontal overflow (" + over + "px)");
    }
    await goHash(page, "#/no-such-screen");
    ok((await h1Text(page)) === "Page not found", width + "px: an unknown route shows a Not found screen (" + (await h1Text(page)) + ")");
    if (width === 1440) ok((await page.locator('main a[href="#/check"]:visible').count()) >= 1, "Not found links home to #/check");
    ok((await overflow(page)) <= 0, width + "px Not found: no page horizontal overflow");
    await ctx.close();
  }); }

  console.log("focus on route change");
  await guard("block at line 91", async () => {
    const { ctx, page } = await open({}, "#/check");
    await page.locator("#rail").getByRole("link", { name: "Examples" }).click();
    await page.waitForTimeout(80);
    ok(await page.evaluate(() => document.activeElement.tagName === "H1" && document.activeElement.textContent.trim() === "Examples"), "rail link moves focus to the new screen's H1");
    ok(await page.evaluate(() => document.activeElement.getAttribute("tabindex") === "-1" && document.activeElement.id !== "main"), "the H1 (tabindex=-1), not the whole workspace, takes focus");
    await page.goBack(); await page.waitForTimeout(80);
    ok(await page.evaluate(() => document.activeElement.tagName === "H1" && /Check a TalkBack report/.test(document.activeElement.textContent)), "browser Back also focuses the H1");
    await ctx.close();
  });

  console.log("menu sheet");
  for (const width of [320, 768]) { await guard("block at line 103", async () => {
    const { ctx, page } = await open({ viewport: { width, height: 800 } }, "#/check");
    const menu = page.getByRole("button", { name: "Menu", exact: true });
    ok(await menu.isVisible(), width + "px: a labelled Menu button is visible");
    ok(!(await page.locator("#rail").getByRole("link", { name: "Examples" }).isVisible()), width + "px: no permanent rail");
    await menu.click(); await page.waitForTimeout(60);
    ok((await menu.getAttribute("aria-expanded")) === "true", width + "px: Menu reports aria-expanded=true when open");
    ok(await page.locator("#rail").getByRole("link", { name: "Examples" }).isVisible(), width + "px: the sheet shows the destinations");
    ok(await page.evaluate(() => document.querySelector("#rail").contains(document.activeElement)), width + "px: focus moves into the sheet");
    let inside = true;
    for (let i = 0; i < 14; i++) { await page.keyboard.press("Tab"); inside = inside && (await page.evaluate(() => document.querySelector("#rail").contains(document.activeElement))); }
    for (let i = 0; i < 3; i++) { await page.keyboard.press("Shift+Tab"); inside = inside && (await page.evaluate(() => document.querySelector("#rail").contains(document.activeElement))); }
    ok(inside, width + "px: Tab and Shift+Tab keep focus inside the open sheet");
    await page.keyboard.press("Escape"); await page.waitForTimeout(60);
    ok(!(await page.locator("#rail").getByRole("link", { name: "Examples" }).isVisible()), width + "px: Escape closes the sheet");
    ok(await page.evaluate(() => document.activeElement.id === "btn-menu"), width + "px: focus returns to the Menu button");
    ok((await menu.getAttribute("aria-expanded")) === "false", width + "px: aria-expanded=false after closing");
    await menu.click(); await page.waitForTimeout(60);
    await page.locator("#rail").getByRole("link", { name: "Draft" }).click(); await page.waitForTimeout(80);
    ok((await h1Text(page)) === "Review draft" && !(await page.locator("#rail").getByRole("link", { name: "Examples" }).isVisible()), width + "px: choosing a destination closes the sheet and opens the screen");
    await ctx.close();
  }); }
  await guard("block at line 125", async () => {
    const { ctx, page } = await open({ viewport: { width: 1440, height: 900 } }, "#/check");
    ok(!(await page.getByRole("button", { name: "Menu", exact: true }).isVisible()) && (await page.locator("#rail").getByRole("link", { name: "Examples" }).isVisible()), "1440px: permanent 216px rail, no Menu button");
    ok(Math.round((await page.locator("#rail").boundingBox()).width) === 216, "1440px: rail is 216px wide");
    await ctx.close();
  });

  console.log("back/forward, deep links and state");
  await guard("block at line 133", async () => {
    const { ctx, page } = await open({}, "#/check");
    await page.fill("#in-title", "Persist title: Save button has no label");
    await page.fill("#in-body", "1. Turn on TalkBack\n2. Open Settings\nTalkBack says \"Button\" on Save.\nApp version: 9.1");
    await page.waitForTimeout(250);
    await page.getByRole("link", { name: "Review draft" }).click(); await page.waitForTimeout(100);
    ok((await page.evaluate(() => location.hash)) === "#/draft" && (await h1Text(page)) === "Review draft", "Review draft opens #/draft on its own screen");
    ok(/App version: 9\.1/.test(await page.textContent("#tpl")) && !(await page.locator("#check").isVisible()), "the draft shows the report's own facts, and the Check form is not on this screen");
    ok((await page.locator("#tpl mark.add").count()) >= 1 && /\[ADD:/.test(await page.textContent("#tpl")), "missing details are marked [ADD: ...] gaps, not filled in");
    await page.goBack(); await page.waitForTimeout(100);
    ok(/^#\/check/.test(await page.evaluate(() => location.hash)) && (await h1Text(page)) === "Check a TalkBack report", "Back returns to Check");
    ok((await page.inputValue("#in-title")) === "Persist title: Save button has no label" && /App version: 9\.1/.test(await page.inputValue("#in-body")), "title and body persist after Draft and Back");
    await page.goForward(); await page.waitForTimeout(100);
    ok((await h1Text(page)) === "Review draft", "Forward returns to Draft");
    await page.reload(); await page.waitForSelector("#checklist li", { state: "attached" }); await page.waitForTimeout(100);
    ok((await h1Text(page)) === "Review draft" && /App version: 9\.1/.test(await page.textContent("#tpl")), "a reload of #/draft keeps the draft in this tab");
    await page.goBack(); await page.waitForTimeout(100);
    ok((await page.inputValue("#in-title")) === "Persist title: Save button has no label", "after a reload, Back still finds the title");

    // Examples: the filter lives in the URL; opening a report and going back restores it
    await goHash(page, "#/examples");
    await page.getByLabel("App", { exact: true }).selectOption("AP"); await page.waitForTimeout(80);
    ok((await page.evaluate(() => location.hash)) === "#/examples?app=AP", "Examples filter is kept in the URL (" + (await page.evaluate(() => location.hash)) + ")");
    const rows = await page.locator("#ex-table tbody tr").count();
    ok(rows === 24, "AntennaPod filter shows the 24 AntennaPod reports (" + rows + ")");
    await page.locator("#ex-table tbody tr").first().getByRole("link", { name: /^Check / }).click(); await page.waitForTimeout(100);
    ok(/^#\/check\?report=AP-\d+$/.test(await page.evaluate(() => location.hash)) && (await page.inputValue("#in-title")).length > 0, "a row opens that report in Check");
    await page.goBack(); await page.waitForTimeout(100);
    ok((await page.locator("#ex-app").inputValue()) === "AP" && (await page.locator("#ex-table tbody tr").count()) === 24, "Back restores the Examples screen with its filter");
    await ctx.close();
  });
  await guard("block at line 164", async () => {
    const { ctx, page } = await open({}, "#/examples?app=WP");
    ok((await h1Text(page)) === "Examples" && (await page.locator("#ex-table tbody tr").count()) === 51, "deep link #/examples?app=WP opens with the filter applied (51 rows)");
    await ctx.close();
  });

  console.log("old links");
  await guard("block at line 171", async () => {
    const { ctx, page } = await open({}, "#check?report=AP-3563");
    const want = await page.evaluate(() => JSON.parse(document.querySelector("#dataset").textContent).find((r) => r.id === "AP-3563").title);
    ok((await page.evaluate(() => location.hash)) === "#/check?report=AP-3563", "#check?report=AP-3563 maps to #/check?report=AP-3563 (" + (await page.evaluate(() => location.hash)) + ")");
    ok((await page.inputValue("#in-title")) === want && (await h1Text(page)) === "Check a TalkBack report", "the old link still loads that report");
    const code = await page.evaluate(() => window.TBC.encodeState("Old text link", "1. Turn on TalkBack"));
    await ctx.close();
    const t = await open({}, "#check?text=" + code);
    ok((await t.page.evaluate(() => location.hash)) === "#/check?text=" + code && (await t.page.inputValue("#in-title")) === "Old text link", "#check?text= links still restore the pasted text");
    await t.ctx.close();
    for (const [old, now, h1] of [["#pilot", "#/research", "Research results"], ["#label", "#/research/labels", "Label reports"], ["#about", "#/research/methods", "Research methods"]]) {
      const o = await open({}, old);
      ok((await o.page.evaluate(() => location.hash)) === now && (await h1Text(o.page)) === h1, old + " maps to " + now);
      await o.ctx.close();
    }
  });

  console.log("light by default, dark only by choice");
  await guard("block at line 189", async () => {
    const { ctx, page } = await open({ colorScheme: "dark" }, "#/check");
    const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    ok((await bg()) === "rgb(247, 248, 250)", "OS prefers dark, first visit: canvas is light #f7f8fa (" + (await bg()) + ")");
    ok(await page.evaluate(() => document.documentElement.getAttribute("data-theme") !== "dark"), "no dark theme attribute by default");
    const btn = page.getByRole("button", { name: "Dark theme" });
    ok((await btn.getAttribute("aria-pressed")) === "false", "an explicit, labelled Dark theme toggle (aria-pressed=false)");
    await btn.click(); await page.waitForTimeout(60);
    ok((await btn.getAttribute("aria-pressed")) === "true" && (await bg()) !== "rgb(247, 248, 250)", "the toggle switches to dark (" + (await bg()) + ")");
    await page.reload(); await page.waitForSelector("#checklist li", { state: "attached" });
    ok(await page.evaluate(() => document.documentElement.getAttribute("data-theme") === "dark"), "the dark choice is remembered after a reload");
    await page.getByRole("button", { name: "Dark theme" }).click(); await page.waitForTimeout(60);
    ok((await bg()) === "rgb(247, 248, 250)", "toggling again returns to light");
    await ctx.close();
  });

  console.log("axe-core, light and dark, 1280 and 320");
  const axeCounts = {};
  for (const width of [1280, 320]) for (const theme of ["light", "dark"]) { await guard("block at line 207", async () => {
    const { ctx, page } = await open({ viewport: { width, height: 900 } }, "#/check", theme === "dark");
    for (const [hash] of SCREENS.concat([["#/no-such-screen"]])) {
      await goHash(page, hash);
      await page.evaluate(AXE);
      const res = await page.evaluate(async () => {
        const r = await window.axe.run(document, { resultTypes: ["violations"] });
        return r.violations.map((x) => x.id + " (" + x.nodes.length + "): " + x.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(", "));
      });
      axeCounts[width + "/" + theme + "/" + hash] = res.length;
      ok(res.length === 0, "axe " + width + "px " + theme + " " + hash + ": " + res.length + " violations" + (res.length ? "\n         " + res.join("\n         ") : ""));
    }
    if (theme === "dark") ok(await page.evaluate(() => document.documentElement.getAttribute("data-theme") === "dark"), width + "px: the dark run really used the dark theme");
    await ctx.close();
  }); }

  console.log("report composer: matched spans and gap prompts");
  await guard("composer", async () => {
    const { ctx, page } = await open({}, "#/check?report=AP-3563");
    const hit = page.locator('#preview mark.hit[data-key="appVersion"]');
    ok((await hit.count()) === 1 && /^1\.7\.3/.test(await hit.textContent()), "the preview highlights the app version where the report says it (" + (await hit.count() ? await hit.textContent() : "none") + ")");
    ok(/matched: App version/.test(await hit.textContent()), "the highlight names its detail in screen-reader text");
    ok((await page.locator("#preview strong").count()) >= 1 && !/\*\*/.test(await page.textContent("#preview")), "**bold** reads as bold, as on GitHub");
    const gap = page.locator('#gaps .gap[data-key="device"]');
    ok((await gap.count()) === 1 && /Not found|Incomplete/.test(await gap.locator("label").textContent()), "a detail the checker did not find is an inline gap prompt");
    await gap.getByRole("button", { name: "Add to report" }).click();
    ok((await page.locator("#gap-device").getAttribute("aria-invalid")) === "true" && /first/.test(await page.textContent("#gap-device-err")) && (await page.evaluate(() => document.activeElement.id)) === "gap-device", "an empty gap is not added: the error is in text, tied to the field, and focus goes there");
    const before = await page.inputValue("#in-body");
    await page.fill("#gap-device", "Pixel 8, Android 14");
    await page.locator('#gaps .gap[data-key="device"]').getByRole("button", { name: "Add to report" }).click();
    await page.waitForTimeout(80);
    const after = await page.inputValue("#in-body");
    ok(after.startsWith(before.replace(/\s+$/, "")) && /\nDevice: Pixel 8, Android 14\n$/.test(after), "Add to report appends the reporter's own words and keeps the original text");
    ok((await page.getAttribute('#checklist li[data-key="device"]', "data-status")) === "present" && (await page.locator('#gaps .gap[data-key="device"]').count()) === 0, "the report is re-checked: the device is now found and its prompt is gone");
    ok(/now finds it/.test(await page.textContent("#gap-status")), "the result is announced: " + (await page.textContent("#gap-status")));
    ok((await page.evaluate(() => location.hash)) === "#/check", "the edited report is no longer the dataset report in the URL");
    await ctx.close();
  });

  console.log("draft actions and empty state");
  await guard("block at line 224", async () => {
    const { ctx, page } = await open({ permissions: ["clipboard-read", "clipboard-write"], acceptDownloads: true }, "#/check?report=AP-3563");
    await page.getByRole("link", { name: "Review draft" }).click(); await page.waitForTimeout(80);
    await page.getByRole("button", { name: "Copy draft" }).click();
    await page.waitForFunction(() => document.querySelector("#copy-tpl-status").textContent);
    ok((await page.evaluate(() => navigator.clipboard.readText())) === (await page.textContent("#tpl")), "Copy draft copies exactly the draft");
    const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 5000 }).catch(() => null), page.getByRole("button", { name: /Download/ }).click()]);
    const dlText = dl ? fs.readFileSync(await dl.path(), "utf8") : "";
    ok(dl && /\.md$/.test(dl.suggestedFilename()) && dlText === (await page.textContent("#tpl")), "Download saves the same draft as a .md file" + (dl ? " (" + dl.suggestedFilename() + ")" : ""));
    await goHash(page, "#/check");
    await page.getByRole("button", { name: "Clear" }).click();
    await goHash(page, "#/draft");
    ok(/Nothing to draft yet/.test(await page.textContent("main")) && (await page.locator('main a[href="#/check"]:visible').count()) >= 1, "an empty report gives a real empty state that points back to Check");
    await ctx.close();
  });

  await browser.close(); server.close();
  ok(!errors.length, "no page or console errors" + (errors.length ? ": " + errors.slice(0, 5).join("; ") : ""));
  console.log("\naxe violations:", JSON.stringify(axeCounts));
  console.log(failures ? failures + " check(s) failed" : "all checks passed");
  process.exitCode = failures ? 1 : 0;
})().catch(async (e) => { console.error(e); process.exitCode = 1; if (browser) await browser.close(); server.close(); });
