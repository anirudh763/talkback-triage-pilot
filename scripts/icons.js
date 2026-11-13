#!/usr/bin/env node
// Render src/icon.svg to src/icon-192.png and src/icon-512.png with a local headless Chromium (Playwright).
// Run after changing the SVG; scripts/build.js then copies the icons to docs/.
"use strict";
const fs = require("fs");
const { chromium } = require("playwright");
const { rel } = require("./lib.js");

(async () => {
  const svg = fs.readFileSync(rel("src", "icon.svg"), "utf8");
  const browser = await chromium.launch();
  for (const size of [192, 512]) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent('<style>html,body{margin:0;background:transparent}svg{display:block;width:' + size + "px;height:" + size + "px}</style>" + svg);
    await page.screenshot({ path: rel("src", "icon-" + size + ".png"), omitBackground: true });
    await page.close();
    console.log("Wrote src/icon-" + size + ".png");
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exitCode = 1; });
