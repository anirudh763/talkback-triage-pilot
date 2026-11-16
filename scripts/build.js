#!/usr/bin/env node
// Build the web app: src/app.html + src/ui.css + src/app.css + src/core.js + src/checker.js + data + saved runs
// -> docs/index.html (one file), plus the two font files it uses. docs/ is what GitHub Pages serves.
"use strict";
const fs = require("fs");
const crypto = require("crypto");
const { rel, safeJson, loadReports, loadRun, listRuns } = require("./lib.js");

const src = (f) => fs.readFileSync(rel("src", f), "utf8");
const script = (code) => code.replace(/<\/script/gi, "<\\/script");
const style = (css) => css.replace(/<\/style/gi, "<\\/style");
const core = src("core.js");
const checker = src("checker.js");
const tpl = src("app.html");
const FONTS = ["atkinson-hyperlegible-latin-400-normal.woff2", "atkinson-hyperlegible-latin-700-normal.woff2", "atkinson-hyperlegible-OFL.txt", "newsreader-variable.ttf", "newsreader-OFL.txt", "inter-variable.ttf", "inter-OFL.txt"];
// Install and offline files: the web app manifest, the icons, and the service worker (versioned cache name).
const STATIC = ["lucide-LICENSE.txt", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png", "icon-maskable.png", "apple-touch-icon.png", "og-card.svg", "og-card.png"];
const VERSION = require("../package.json").version;
const reports = loadReports();

// Only runs made with the fixed removal rules (method 2) are shown in the app.
const archive = {};
for (const id of listRuns()) {
  const run = loadRun(id);
  if (run.meta.method !== 2) continue;
  const meta = Object.assign({}, run.meta);
  delete meta.by;
  archive[id] = { meta, items: run.items };
}

const page = tpl
  .replace("/*STORAGE_MIGRATION*/", () => script(src("storage-migration.js")))
  .replace("/*UICSS*/", () => style(src("ui.css")))
  .replace("/*APPCSS*/", () => style(src("app.css") + "\n" + src("product.css") + "\n" + src("pwa.css") + "\n" + src("routes.css")))
  .replace("/*CORE*/", () => script(core) + "\n" + script(checker) + "\n" + script(src("platform-checks.js")) + "\n" + script(src("report-import.js")) + "\n" + script(src("local-profile.js")) + "\n" + script(src("product.js")) + "\n" + script(src("pwa.js")) + "\n" + script(src("ecosystem.js")) + "\n" + script(src("encrypted-backup.js")) + "\n" + script(src("backup-ui.js")) + "\n" + script(src("sync-provider.js")) + "\n" + script(src("sync-ui.js")))
  .replace("/*DATA*/", () => safeJson(reports))
  .replace("/*ARCHIVE*/", () => safeJson(archive))
  .replace("/*VERSION*/", () => VERSION);

// Content Security Policy: the page may load only its own files (the fonts) and run only its own inline
// scripts, listed by hash; it can't send requests anywhere. Inline styles stay allowed (style attributes).
const metadata=fs.readFileSync(rel("scripts","ecosystem-metadata.html"),"utf8");
const hashes = [...(page+metadata).matchAll(/<script(?: type="application\/ld\+json")?>([\s\S]*?)<\/script>/g)].map((m) => "'sha256-" + crypto.createHash("sha256").update(m[1], "utf8").digest("base64") + "'");
const csp = ["default-src 'self'", "script-src " + hashes.join(" "), "style-src 'self' 'unsafe-inline'", "font-src 'self'", "img-src 'self' data:",
  "connect-src 'self' https://api.github.com", "worker-src 'self'", "manifest-src 'self'", "object-src 'none'", "base-uri 'none'", "form-action 'none'"].join("; ");

// The template has no <html>/<head>/<body>: wrap it so it is a complete page on GitHub Pages.
const doc = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
  '<meta http-equiv="Content-Security-Policy" content="' + csp + '">\n' +
  '<meta name="description" content="Paste an Android accessibility bug report and see which details a developer needs are missing: TalkBack steps, app version, device, expected vs. actual. Runs offline in the browser.">\n' +
  '<meta name="application-name" content="CueReport">\n<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-status-bar-style" content="default">\n<meta name="theme-color" content="#fbf9f5">\n' +
  '<link rel="icon" href="icon.svg" type="image/svg+xml">\n<link rel="apple-touch-icon" href="apple-touch-icon.png">\n<link rel="manifest" href="manifest.webmanifest">\n' +
  metadata + "<style>body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>\n</head>\n<body>\n" + page + "\n</body>\n</html>\n";
fs.mkdirSync(rel("docs"), { recursive: true });
fs.writeFileSync(rel("docs", "index.html"), doc);
fs.writeFileSync(rel("docs", ".nojekyll"), "");
for (const f of FONTS.concat(STATIC)) fs.copyFileSync(rel("src", f), rel("docs", f));
require("./build-pwa.cjs")(rel("."), "cuereport", rel("src", "sw.js"));
console.log("Wrote docs/index.html (" + Math.round(doc.length / 1024) + " KB, " + reports.length + " reports, " + Object.keys(archive).length + " saved run(s))");
