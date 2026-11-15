// Root visual gate for the routed, light-first UI (round 4 rebuild). Serves docs/ as GitHub Pages would.
// Covers: each task on its own hash route with its own H1 and document title, focus on the H1 after a route
// change, the Menu sheet (Escape closes it and returns focus), Back/Forward and deep links restoring screen and
// state (title/body after Draft, the Examples filter), old #check?report= / #pilot / #label / #about links,
// light by default even when the OS prefers dark, an explicit remembered dark toggle, no page overflow at
// 320/768/1440, axe-core on every route in light/dark at all three widths, and the native Plans dialog.
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
const APP = "CueReport";

let failures = 0;
let browser = null;
let expectedGithubFailure = false;
const ok = (cond, msg) => { console.log((cond ? "  ok   " : "  FAIL ") + msg); if (!cond) failures++; };
const h1Text = (page) => page.evaluate(() => { const h = [...document.querySelectorAll("main h1")].find((e) => e.offsetParent || e.getClientRects().length); return h ? h.textContent.trim() : null; });
const overflow = (page) => page.evaluate(() => document.scrollingElement.scrollWidth - window.innerWidth);

(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + server.address().port + "/";
  browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const errors = [];
  async function open(opts, hash, dark) {
    const ctx = await browser.newContext(Object.assign({ viewport: { width: 1280, height: 900 } }, opts));
    if (dark) await ctx.addInitScript(() => { try { localStorage.setItem("tbt-theme", "dark"); } catch (e) { /* ignore */ } });
    const page = await ctx.newPage();
    page.setDefaultTimeout(4000); // a missing control fails fast instead of waiting 30 s
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
    page.on("console", (m) => { if (m.type() === "error" && !(expectedGithubFailure && /Failed to load resource: the server responded with a status of (403|404|429)/.test(m.text()))) errors.push("console: " + m.text()); });
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
      // captions and table legends must not be clipped by the table's own scroll region
      const clipped = await page.$$eval("main caption, main .legendline", (els) => els.filter((e) => e.getClientRects().length && !e.closest("th, td")).filter((e) => {
        const r = e.getBoundingClientRect(), box = e.closest(".tablewrap");
        const edge = Math.min(window.innerWidth, box ? box.getBoundingClientRect().right : window.innerWidth);
        return r.right > edge + 1 || e.scrollWidth > e.clientWidth + 1;
      }).map((e) => (e.id || e.tagName) + " " + Math.round(e.getBoundingClientRect().width) + "px"));
      ok(!clipped.length, width + "px " + hash + ": table captions and legends fit their region" + (clipped.length ? " (" + clipped.join(", ") + ")" : ""));
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

  console.log("H1 focus on every route, reached through the navigation");
  // each target is opened from a different screen: rail links for the Work/Learn screens, the Research section nav
  // for Labels and Methods, and an address change for Not found (it has no nav link)
  const VIA = {
    "#/check": ["#/examples", (p) => p.locator("#rail").getByRole("link", { name: "Check a report" }).click()],
    "#/draft": ["#/check", (p) => p.locator("#rail").getByRole("link", { name: "Draft" }).click()],
    "#/examples": ["#/draft", (p) => p.locator("#rail").getByRole("link", { name: "Examples" }).click()],
    "#/research": ["#/check", (p) => p.locator("#rail").getByRole("link", { name: "Research" }).click()],
    "#/research/labels": ["#/research", (p) => p.locator("#pilot nav.subnav").getByRole("link", { name: "Labels" }).click()],
    "#/research/methods": ["#/research/labels", (p) => p.locator("#label nav.subnav").getByRole("link", { name: "Methods" }).click()],
    "#/no-such-screen": ["#/examples", (p) => p.evaluate(() => { location.hash = "#/no-such-screen"; })],
  };
  await guard("H1 focus on every route", async () => {
    const { ctx, page } = await open({}, "#/check");
    for (const [hash, h1] of SCREENS.map((x) => [x[0], x[1]]).concat([["#/no-such-screen", "Page not found"]])) {
      const [from, nav] = VIA[hash];
      await goHash(page, from);
      await nav(page); await page.waitForTimeout(80);
      const got = await page.evaluate(() => ({ tag: document.activeElement.tagName, text: document.activeElement.textContent.trim(), hash: location.hash.split("?")[0] }));
      ok(got.tag === "H1" && got.text === h1 && got.hash === hash, from + " -> " + hash + ": focus is on the H1 \"" + h1 + "\" (" + got.tag + " \"" + got.text.slice(0, 40) + "\")");
    }
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
    ok(!(await page.getByRole("button", { name: "Menu", exact: true }).isVisible()) && (await page.locator("#rail").getByRole("link", { name: "Examples" }).isVisible()), "1440px: top route tabs, no Menu button");
    const navBox = await page.locator("#rail").boundingBox();
    const sheetBox = await page.locator(".document-sheet").first().boundingBox();
    ok(navBox.width === 1440 && navBox.height < 120 && sheetBox.y > navBox.y + navBox.height, "1440px: full-width compact navigation above the document sheet");
    await ctx.close();
  });

  console.log("Team QA plans native dialog");
  for (const width of [320, 768, 1440]) await guard("plans dialog " + width, async () => {
    const { ctx, page } = await open({ viewport: { width, height: 900 } }, "#/check");
    const trigger = page.getByRole("button", { name: "Team QA plans" });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Team QA plans" });
    ok(await dialog.isVisible(), width + "px: Team QA plans opens as a named native dialog");
    ok(/free, offline report checker today/.test(await dialog.textContent()) && /\$29/.test(await dialog.textContent()) && /\$149/.test(await dialog.textContent()) && /proposals; there is no checkout/.test(await dialog.textContent()), width + "px: available sandbox and proposed prices are distinguished; no checkout is claimed");
    ok(/no AWS resources.*are deployed/.test(await dialog.textContent()) && /public GitHub issue draft/.test(await dialog.textContent()) && /Do not include private reports or email addresses/.test(await dialog.textContent()), width + "px: proposed AWS status and public-feedback privacy warning are visible");
    ok((await dialog.locator("input, textarea, form, a[href^='mailto:']").count()) === 0, width + "px: plans dialog has no fake capture form or email link");
    const bounds = await dialog.boundingBox();
    ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width && bounds.y >= 0 && bounds.y + bounds.height <= 900, width + "px: modal stays within the viewport");
    await page.evaluate(AXE);
    const violations = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ["violations"] })).violations.map((v) => v.id));
    ok(violations.length === 0, width + "px: axe reports 0 violations with the modal open" + (violations.length ? " (" + violations.join(", ") + ")" : ""));
    ok(await page.evaluate(() => document.activeElement.id === "btn-plans-close"), width + "px: opening places focus on Close");
    await page.keyboard.press("Tab");
    ok(await page.evaluate(() => document.activeElement.id === "btn-plans-feedback"), width + "px: Tab reaches the public feedback link");
    await page.keyboard.press("Shift+Tab");
    ok(await page.evaluate(() => document.activeElement.id === "btn-plans-close"), width + "px: Shift+Tab returns from the link to Close");
    await page.keyboard.press("Shift+Tab");
    ok(await page.evaluate(() => document.activeElement.id === "btn-plans-feedback"), width + "px: Shift+Tab wraps from Close to the last modal action");
    await page.keyboard.press("Tab");
    ok(await page.evaluate(() => document.activeElement.id === "btn-plans-close"), width + "px: Tab wraps from the public link to Close");
    await page.keyboard.press("Escape");
    ok(!(await dialog.isVisible()) && await page.evaluate(() => document.activeElement.id === "btn-plans"), width + "px: Escape closes the modal and returns focus to its trigger");
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

  console.log("edits after shared links survive Back and reload");
  for (const change of ["body", "title", "gap"]) await guard("shared link edit: " + change, async () => {
    const { ctx, page } = await open({ permissions: ["clipboard-read", "clipboard-write"] }, "#/check");
    const title = "Shared report: Save has no label";
    const body = "1. Turn on TalkBack\n2. Open Settings\nTalkBack says Button on Save.";
    await page.fill("#in-title", title);
    await page.fill("#in-body", body);
    await page.waitForTimeout(250);
    await page.click("#btn-link");
    await page.waitForFunction(() => location.hash.includes("?text="));
    if (change === "title") {
      // Legacy shared links must open normally, then detach when their text is edited.
      const legacy = (await page.evaluate(() => location.hash)).replace("#/check", "#check");
      await goHash(page, legacy);
    }
    ok((await page.inputValue("#in-title")) === title && (await page.inputValue("#in-body")) === body,
      change + ": the shared link opens its original report");
    if (change === "body") await page.fill("#in-body", body + "\nExact gesture: swipe right twice.");
    else if (change === "title") await page.fill("#in-title", title + " after swiping right twice");
    else {
      await page.fill("#gap-appVersion", "9.9.1");
      await page.locator('.gap[data-key="appVersion"]').getByRole("button", { name: "Add to report" }).click();
    }
    await page.waitForTimeout(250);
    const editedTitle = await page.inputValue("#in-title"), editedBody = await page.inputValue("#in-body");
    ok((await page.evaluate(() => location.hash)) === "#/check",
      change + ": editing detaches the frozen link without putting private edits in the URL");
    await page.getByRole("link", { name: "Review draft" }).click();
    await page.waitForTimeout(100);
    ok((await page.textContent("#tpl")).includes(change === "title" ? editedTitle : change === "gap" ? "9.9.1" : "swipe right twice"),
      change + ": Draft contains the new fact");
    await page.goBack(); await page.waitForTimeout(100);
    ok((await page.inputValue("#in-title")) === editedTitle && (await page.inputValue("#in-body")) === editedBody,
      change + ": browser Back keeps the exact edited title and body");
    await page.reload(); await page.waitForSelector("#checklist li", { state: "attached" });
    ok((await page.inputValue("#in-title")) === editedTitle && (await page.inputValue("#in-body")) === editedBody,
      change + ": reload keeps the exact edited title and body");
    await ctx.close();
  });

  console.log("primary action in view, unknown report links");
  await guard("Review draft in view", async () => {
    const { ctx, page } = await open({ viewport: { width: 1440, height: 900 } }, "#/check?report=AP-3563");
    const box = await page.getByRole("link", { name: "Review draft" }).boundingBox();
    ok(box && box.y >= 0 && box.y + box.height <= 900 && box.x + box.width <= 1440, "1440x900: Review draft is inside the viewport without scrolling (y=" + (box && Math.round(box.y)) + ")");
    await ctx.close();
  });
  await guard("unknown report", async () => {
    const { ctx, page } = await open({}, "#check?report=AP-999999");
    ok(/Report not found/.test(await page.textContent("#ex-source")) && /AP-999999/.test(await page.textContent("#ex-source")), "an unknown report ID says so instead of silently showing a sample: " + (await page.textContent("#ex-source")).slice(0, 80));
    ok(!/AP-999999/.test(await page.evaluate(() => location.hash)), "the address no longer points at the missing report");
    await ctx.close();
  });

  await guard("focus not obscured", async () => {
    // WCAG 2.4.11: a focused control stays at least partly visible past the sticky header and the sticky action row
    const { ctx, page } = await open({ viewport: { width: 375, height: 640 } }, "#/check?report=AP-3563");
    const hidden = [];
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press("Tab");
      const r = await page.evaluate(() => {
        const a = document.activeElement, b = a.getBoundingClientRect();
        const head = document.querySelector(".loc").getBoundingClientRect();
        const bar = document.querySelector("#check .focal");
        if (a === document.body || a.closest(".loc") || a.id === "skip") return { visible: true };
        // the action row covers only what is below its top edge while it is pinned there
        let barTop = window.innerHeight;
        if (bar && !bar.contains(a) && bar.getClientRects().length) { const t = bar.getBoundingClientRect().top; if (t > b.top) barTop = t; }
        const top = Math.max(b.top, head.bottom), bottom = Math.min(b.bottom, barTop, window.innerHeight);
        return { id: a.id || a.textContent.trim().slice(0, 24), visible: bottom > top };
      });
      if (!r.visible) hidden.push(r.id);
    }
    ok(!hidden.length, "375px: no focused control is hidden under the sticky header or action row" + (hidden.length ? " (" + hidden.join(", ") + ")" : ""));
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
    ok((await bg()) === "rgb(255, 249, 239)", "OS prefers dark, first visit: canvas is light ivory #fff9ef (" + (await bg()) + ")");
    ok(await page.evaluate(() => document.documentElement.getAttribute("data-theme") !== "dark"), "no dark theme attribute by default");
    const btn = page.locator("#btn-theme");
    ok((await btn.getAttribute("aria-pressed")) === "false", "an explicit, labelled Dark theme toggle (aria-pressed=false)");
    await btn.click(); await page.waitForTimeout(60);
    ok((await btn.getAttribute("aria-pressed")) === "true" && (await bg()) !== "rgb(255, 249, 239)", "the toggle switches to dark (" + (await bg()) + ")");
    await page.reload(); await page.waitForSelector("#checklist li", { state: "attached" });
    ok(await page.evaluate(() => document.documentElement.getAttribute("data-theme") === "dark"), "the dark choice is remembered after a reload");
    await page.getByRole("button", { name: /^Light theme/ }).click(); await page.waitForTimeout(60);
    ok((await bg()) === "rgb(255, 249, 239)", "toggling again returns to light");
    await ctx.close();
  });

  console.log("axe-core, light and dark, 1440, 768 and 320");
  const axeCounts = {};
  for (const width of [1440, 768, 320]) for (const theme of ["light", "dark"]) { await guard("block at line 207", async () => {
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

  console.log("local draft, GitHub import and issue link privacy");
  await guard("local draft autosave", async () => {
    const { ctx, page } = await open();
    await page.fill("#in-title", "Saved offline title"); await page.fill("#in-body", "A local draft with no credentials.");
    await page.waitForFunction(() => localStorage.getItem("cuer-report-draft-v1") && document.querySelector("#draft-save-status").textContent === "Draft saved on this device.");
    const reopened = await ctx.newPage(); await reopened.goto(base); await reopened.waitForSelector("#checklist li", { state: "attached" });
    ok((await reopened.inputValue("#in-title")) === "Saved offline title" && (await reopened.inputValue("#in-body")) === "A local draft with no credentials.", "versioned local draft restores in a fresh tab");
    await reopened.fill("#in-title", ""); await reopened.fill("#in-body", "");
    await reopened.waitForTimeout(450);
    ok(await reopened.evaluate(() => localStorage.getItem("cuer-report-draft-v1") === null), "manually erasing both fields removes the saved copy");
    const erased = await ctx.newPage(); await erased.goto(base); await erased.waitForSelector("#checklist li", { state: "attached" });
    ok((await erased.inputValue("#in-title")) !== "Saved offline title" &&
      (await erased.inputValue("#in-body")) !== "A local draft with no credentials." &&
      !(await erased.textContent("#draft-save-status")).includes("Restored saved draft"), "a fresh tab shows the public sample instead of manually erased report text");
    await erased.close();
    await reopened.fill("#in-title", "Reset this draft");
    await reopened.waitForFunction(() => document.querySelector("#draft-save-status").textContent === "Draft saved on this device.");
    await reopened.getByRole("button", { name: "Reset saved draft" }).click();
    ok((await reopened.inputValue("#in-title")) === "" && await reopened.evaluate(() => localStorage.getItem("cuer-report-draft-v1") === null), "Reset saved draft clears fields and removes local copy");
    await ctx.close();
  });
  for (const [name, errorName, message] of [["blocked", "SecurityError", /storage is blocked/], ["quota", "QuotaExceededError", /storage is full/]]) { await guard(name + " storage", async () => {
    const ctx = await browser.newContext();
    await ctx.addInitScript((type) => {
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key === "cuer-report-draft-v1") throw new DOMException("blocked for test", type);
        return set.call(this, key, value);
      };
    }, errorName);
    const page = await ctx.newPage(); await page.goto(base); await page.waitForSelector("#checklist li", { state: "attached" });
    await page.fill("#in-title", "Unsaved title");
    await page.waitForFunction(() => /storage is (blocked|full)/.test(document.querySelector("#draft-save-status").textContent));
    ok(message.test(await page.textContent("#draft-save-status")), name + " storage failure has an explicit status");
    await ctx.close();
  }); }
  await guard("malformed draft storage", async () => {
    const ctx = await browser.newContext(); await ctx.addInitScript(() => localStorage.setItem("cuer-report-draft-v1", "{bad"));
    const page = await ctx.newPage(); await page.goto(base); await page.waitForSelector("#checklist li", { state: "attached" });
    await page.waitForFunction(() => /invalid or too large/.test(document.querySelector("#draft-save-status").textContent));
    ok(/invalid or too large/.test(await page.textContent("#draft-save-status")), "malformed saved JSON is ignored with a status");
    await page.getByRole("button", { name: "Reset saved draft" }).click();
    ok(await page.evaluate(() => localStorage.getItem("cuer-report-draft-v1") === null), "reset removes malformed data");
    await ctx.close();
  });
  await guard("strict GitHub issue import", async () => {
    const { ctx, page } = await open(); let calls = [];
    await page.route("https://api.github.com/**", async (route) => {
      calls.push(route.request().url());
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
        number: 42, title: "<img src=x onerror=alert(1)>", body: "TalkBack says <script>not markup</script>.\n" + "x".repeat(20),
      }) });
    });
    await page.locator(".github-import summary").click();
    await page.fill("#github-issue-url", "https://github.com/acme/accessibility/issues/42");
    await page.getByRole("button", { name: "Import issue" }).click();
    await page.waitForFunction(() => /Issue imported/.test(document.querySelector("#import-status").textContent));
    ok(calls.length === 1 && calls[0] === "https://api.github.com/repos/acme/accessibility/issues/42", "valid public URL maps only to the fixed GitHub REST endpoint");
    ok((await page.locator("#preview img, #preview script").count()) === 0 && (await page.locator("#in-title").inputValue()).startsWith("<img"), "hostile title and body remain report text, not HTML");
    ok((await page.inputValue("#github-repo")) === "acme/accessibility", "imported repository pre-fills the new issue target");
    await page.fill("#github-issue-url", "https://github.com.evil.example/acme/accessibility/issues/42");
    await page.getByRole("button", { name: "Import issue" }).click();
    ok(calls.length === 1 && /Enter a public issue URL/.test(await page.textContent("#import-status")), "lookalike host is rejected before network access");
    await page.fill("#github-issue-url", "https://reporter:token@github.com/acme/accessibility/issues/42");
    await page.getByRole("button", { name: "Import issue" }).click();
    ok(calls.length === 1 && /Enter a public issue URL/.test(await page.textContent("#import-status")), "credential-bearing URLs are rejected before network access");
    await ctx.close();
  });
  for (const [status, pattern] of [[403, /rate-limited/], [404, /could not find/], [429, /rate-limited/]]) { await guard("GitHub import " + status, async () => {
    const { ctx, page } = await open(); await page.route("https://api.github.com/**", (route) => route.fulfill({ status, contentType: "application/json", body: "{}" }));
    expectedGithubFailure = true;
    await page.locator(".github-import summary").click(); await page.fill("#github-issue-url", "https://github.com/acme/accessibility/issues/42");
    await page.getByRole("button", { name: "Import issue" }).click(); await page.waitForFunction((source) => new RegExp(source).test(document.querySelector("#import-status").textContent), pattern.source);
    ok(pattern.test(await page.textContent("#import-status")), status + " response has an actionable import message"); expectedGithubFailure = false; await ctx.close();
  }); }
  await guard("GitHub import response size", async () => {
    const { ctx, page } = await open();
    const payload = JSON.stringify({ title: "Too large", body: "x".repeat(270 * 1024) });
    await page.route("https://api.github.com/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: payload }));
    await page.locator(".github-import summary").click(); await page.fill("#github-issue-url", "https://github.com/acme/accessibility/issues/42");
    await page.getByRole("button", { name: "Import issue" }).click(); await page.waitForFunction(() => /256 KiB import limit/.test(document.querySelector("#import-status").textContent));
    ok(/256 KiB import limit/.test(await page.textContent("#import-status")), "streamed GitHub response is stopped above the 256 KiB cap");
    await ctx.close();
  });
  await guard("stale GitHub import", async () => {
    const { ctx, page } = await open();
    await page.route("https://api.github.com/**", async (route) => { await new Promise((r) => setTimeout(r, 180)); await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ title: "Old response", body: "Old body" }) }).catch(() => {}); });
    await page.locator(".github-import summary").click(); await page.fill("#github-issue-url", "https://github.com/acme/accessibility/issues/42");
    await page.getByRole("button", { name: "Import issue" }).click(); await page.fill("#in-title", "Typed after request"); await page.waitForTimeout(240);
    ok((await page.inputValue("#in-title")) === "Typed after request" && /cancelled because the report changed/.test(await page.textContent("#import-status")), "a stale request cannot replace newer user text");
    await ctx.close();
  });
  await guard("prefilled GitHub link and length fallback", async () => {
    const { ctx, page } = await open({}, "#/check?report=AP-3563"); await page.getByRole("link", { name: "Review draft" }).click();
    const link = page.locator("#btn-open-github-issue");
    await page.waitForFunction(() => document.querySelector("#btn-open-github-issue").href.startsWith("https://github.com/"));
    const href = await link.getAttribute("href");
    ok(!(await link.isHidden()) && /^https:\/\/github\.com\/AntennaPod\/AntennaPod\/issues\/new\?/.test(href || ""), "sample repository gets a user-initiated prefilled new-issue link (" + (href || "no href") + ")");
    await goHash(page, "#/check"); await page.fill("#in-title", "Large report"); await page.fill("#in-body", "x".repeat(8000)); await page.waitForTimeout(400); await goHash(page, "#/draft");
    ok(await link.isHidden() && /longer than 7,000/.test(await page.textContent("#github-link-status")) &&
      await page.locator("#btn-copy-tpl").isVisible() && await page.locator("#btn-dl-tpl").isVisible(), "overlong prefill is disabled while Copy and Download stay available");
    await ctx.close();
  });

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

  await guard("highlight offsets", async () => {
    const { ctx, page } = await open({}, "#/check");
    // "İ" becomes two code units when lower-cased, which shifted offsets taken from a lower-cased copy
    await page.fill("#in-title", "İİİİ Istanbul list");
    await page.fill("#in-body", "İİİİ İstanbul İzmir screen.\nApp version: 3.1.0\nTalkBack says Button.");
    await page.waitForTimeout(300);
    const hit = page.locator('#preview mark.hit[data-key="appVersion"]');
    const t = (await hit.count()) ? (await hit.textContent()).replace(/ \(matched:.*$/, "") : "";
    ok(t === "3.1.0", "with İ before it, the app version highlight covers exactly \"3.1.0\" (" + JSON.stringify(t) + ")");
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
